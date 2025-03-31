import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query,
  where
} from 'firebase/firestore';
import { MarkerPreference } from '../types';
import './MarkerPreferences.css';

// Couleurs disponibles pour les marqueurs
const AVAILABLE_COLORS = [
  { name: 'Rouge', value: '#ff3b30' },
  { name: 'Jaune', value: '#ffcc00' },
  { name: 'Vert', value: '#34c759' },
  { name: 'Cyan', value: '#00c7be' },
  { name: 'Bleu', value: '#007aff' },
  { name: 'Magenta', value: '#af52de' },
  { name: 'Rose', value: '#ff2d55' },
  { name: 'Orange', value: '#ff9500' },
  { name: 'Violet', value: '#5856d6' },
  { name: 'Gris', value: '#8e8e93' },
  { name: 'Noir', value: '#000000' }
];

// Icônes disponibles pour les marqueurs
const AVAILABLE_ICONS = [
  { name: 'Cercle', value: 'circle' },
  { name: 'Carré', value: 'square' },
  { name: 'Triangle', value: 'triangle' },
  { name: 'Flèche fermée', value: 'forward arrow' },
  { name: 'Flèche ouverte', value: 'open arrow' },
  { name: 'Flèche arrière ouverte', value: 'backward open arrow' },
  { name: 'Goutte d\'eau', value: 'droplet' },
  { name: 'Épingle', value: 'pin' },
  { name: 'Étoile', value: 'star' },
  { name: 'Losange', value: 'diamond' },
  { name: 'Hexagone', value: 'hexagon' },
  { name: 'Croix', value: 'cross' }
];

// Types de sites disponibles
const SITE_TYPES = [
  'Laboratoire',
  'Clinique',
  'Plateau technique',
  'Point de collecte',
  'Etablissement de santé',
  'Ehpad',
  'Vétérinaire'
];

const MarkerPreferences: React.FC = () => {
  const [preferences, setPreferences] = useState<MarkerPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState<{[key: string]: MarkerPreference}>({});
  const [previewColors, setPreviewColors] = useState<{[key: string]: string}>({});
  
  // États pour la sélection
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  useEffect(() => {
    fetchPreferences();
  }, []);

  // Effet pour gérer la sélection/désélection de toutes les préférences
  useEffect(() => {
    if (selectAll) {
      setSelectedPreferences(preferences.map(pref => pref.id));
    } else if (selectedPreferences.length === preferences.length && preferences.length > 0) {
      setSelectedPreferences([]);
    }
  }, [selectAll, preferences]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const preferencesRef = collection(db, 'markerPreferences');
      const snapshot = await getDocs(preferencesRef);
      
      let preferencesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MarkerPreference[];
      
      // Si aucune préférence n'existe, créer les préférences par défaut
      if (preferencesData.length === 0) {
        preferencesData = await createDefaultPreferences();
      } else {
        // Vérifier et supprimer les doublons
        preferencesData = await checkAndRemoveDuplicates(preferencesData);
      }
      
      setPreferences(preferencesData);
      
      // Initialiser les couleurs de prévisualisation
      const initialPreviewColors: {[key: string]: string} = {};
      preferencesData.forEach(pref => {
        initialPreviewColors[pref.id] = pref.color;
      });
      setPreviewColors(initialPreviewColors);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des préférences de marqueurs:', error);
      setError('Erreur lors de la récupération des préférences de marqueurs');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour vérifier et supprimer les doublons
  const checkAndRemoveDuplicates = async (preferences: MarkerPreference[]): Promise<MarkerPreference[]> => {
    // Regrouper les préférences par type de site
    const groupedBySiteType: { [key: string]: MarkerPreference[] } = {};
    
    preferences.forEach(pref => {
      const siteType = pref.siteType.toLowerCase().trim();
      if (!groupedBySiteType[siteType]) {
        groupedBySiteType[siteType] = [];
      }
      groupedBySiteType[siteType].push(pref);
    });
    
    // Identifier et supprimer les doublons
    const duplicatesRemoved = [];
    const updatedPreferences = [...preferences];
    
    for (const siteType in groupedBySiteType) {
      const prefsForType = groupedBySiteType[siteType];
      
      if (prefsForType.length > 1) {
        // Garder la première préférence et supprimer les autres
        const [keepPref, ...duplicates] = prefsForType;
        
        for (const duplicate of duplicates) {
          try {
            const prefRef = doc(db, 'markerPreferences', duplicate.id);
            await deleteDoc(prefRef);
            duplicatesRemoved.push(duplicate);
            
            // Retirer le doublon de la liste des préférences
            const index = updatedPreferences.findIndex(p => p.id === duplicate.id);
            if (index !== -1) {
              updatedPreferences.splice(index, 1);
            }
          } catch (error) {
            console.error(`Erreur lors de la suppression du doublon ${duplicate.id}:`, error);
          }
        }
      }
    }
    
    if (duplicatesRemoved.length > 0) {
      console.log(`${duplicatesRemoved.length} doublons de préférences ont été supprimés.`);
    }
    
    return updatedPreferences;
  };

  const createDefaultPreferences = async (): Promise<MarkerPreference[]> => {
    const defaultPreferences: Partial<MarkerPreference>[] = [
      { siteType: 'Laboratoire', color: '#ff3b30', icon: 'droplet', name: 'Laboratoire', apercu: 'droplet' },
      { siteType: 'Clinique', color: '#ffcc00', icon: 'circle', name: 'Clinique', apercu: 'circle' },
      { siteType: 'Plateau technique', color: '#34c759', icon: 'square', name: 'Plateau technique', apercu: 'square' },
      { siteType: 'Point de collecte', color: '#00c7be', icon: 'triangle', name: 'Point de collecte', apercu: 'triangle' },
      { siteType: 'Etablissement de santé', color: '#007aff', icon: 'forward arrow', name: 'Établissement de santé', apercu: 'forward arrow' },
      { siteType: 'Ehpad', color: '#af52de', icon: 'star', name: 'Ehpad', apercu: 'star' },
      { siteType: 'Vétérinaire', color: '#ff2d55', icon: 'pin', name: 'Vétérinaire', apercu: 'pin' }
    ];
    
    const createdPreferences: MarkerPreference[] = [];
    
    for (const pref of defaultPreferences) {
      try {
        // Vérifier si une préférence pour ce type de site existe déjà
        const preferencesRef = collection(db, 'markerPreferences');
        const q = query(preferencesRef, where("siteType", "==", pref.siteType));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          // Ajouter seulement si aucune préférence n'existe pour ce type de site
          const docRef = await addDoc(collection(db, 'markerPreferences'), pref);
          createdPreferences.push({
            id: docRef.id,
            ...pref
          } as MarkerPreference);
        } else {
          // Utiliser la préférence existante
          snapshot.docs.forEach(doc => {
            createdPreferences.push({
              id: doc.id,
              ...doc.data()
            } as MarkerPreference);
          });
        }
      } catch (error) {
        console.error('Erreur lors de la création des préférences par défaut:', error);
      }
    }
    
    return createdPreferences;
  };

  const toggleEditMode = () => {
    if (editMode) {
      // Sortir du mode édition sans sauvegarder
      setEditingPreferences({});
      setSelectedPreferences([]);
      setSelectAll(false);
    } else {
      // Entrer en mode édition
      const initialEditState: {[key: string]: MarkerPreference} = {};
      preferences.forEach(pref => {
        initialEditState[pref.id] = { ...pref };
      });
      setEditingPreferences(initialEditState);
    }
    setEditMode(!editMode);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Mettre à jour les préférences modifiées
      for (const [id, pref] of Object.entries(editingPreferences)) {
        const prefRef = doc(db, 'markerPreferences', id);
        await updateDoc(prefRef, {
          color: pref.color,
          icon: pref.icon,
          name: pref.name,
          apercu: pref.icon // Utiliser icon comme valeur pour aperçu
        });
      }
      
      // Recharger les préférences
      await fetchPreferences();
      
      // Sortir du mode édition
      setEditMode(false);
      setEditingPreferences({});
      setSelectedPreferences([]);
      setSelectAll(false);
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error);
      setError('Erreur lors de la sauvegarde des préférences');
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (id: string, color: string) => {
    setEditingPreferences({
      ...editingPreferences,
      [id]: {
        ...editingPreferences[id],
        color
      }
    });
    
    // Mettre à jour la prévisualisation
    setPreviewColors({
      ...previewColors,
      [id]: color
    });
  };

  const handleIconChange = (id: string, icon: string) => {
    setEditingPreferences({
      ...editingPreferences,
      [id]: {
        ...editingPreferences[id],
        icon
      }
    });
  };

  const handleNameChange = (id: string, name: string) => {
    setEditingPreferences({
      ...editingPreferences,
      [id]: {
        ...editingPreferences[id],
        name
      }
    });
  };

  // Fonction pour gérer la sélection/désélection d'une préférence
  const togglePreferenceSelection = (id: string) => {
    if (selectedPreferences.includes(id)) {
      setSelectedPreferences(selectedPreferences.filter(prefId => prefId !== id));
      // Si on désélectionne une préférence, on désactive aussi "Tout sélectionner"
      setSelectAll(false);
    } else {
      setSelectedPreferences([...selectedPreferences, id]);
      // Si toutes les préférences sont sélectionnées, on active "Tout sélectionner"
      if (selectedPreferences.length + 1 === preferences.length) {
        setSelectAll(true);
      }
    }
  };

  // Fonction pour gérer la sélection/désélection de toutes les préférences
  const handleSelectAllChange = () => {
    setSelectAll(!selectAll);
  };

  // Fonction pour supprimer les préférences sélectionnées
  const handleDeleteSelected = async () => {
    if (selectedPreferences.length === 0) {
      return;
    }

    // Confirmation avant suppression
    const confirmMessage = `Êtes-vous sûr de vouloir supprimer ${selectedPreferences.length} préférence(s) de marqueur ?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      
      // Supprimer les préférences sélectionnées
      for (const prefId of selectedPreferences) {
        const prefRef = doc(db, 'markerPreferences', prefId);
        await deleteDoc(prefRef);
      }
      
      // Recharger les préférences
      await fetchPreferences();
      
      // Réinitialiser les sélections
      setSelectedPreferences([]);
      setSelectAll(false);
      
    } catch (error) {
      console.error('Erreur lors de la suppression des préférences:', error);
      setError('Erreur lors de la suppression des préférences');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour ajouter une nouvelle préférence
  const handleAddPreference = async () => {
    try {
      setLoading(true);
      
      // Créer une nouvelle préférence avec des valeurs par défaut
      const newPreference: Partial<MarkerPreference> = {
        siteType: '',
        color: '#007aff',
        icon: 'droplet',
        name: 'Nouveau type',
        apercu: 'droplet'
      };
      
      // Ajouter la nouvelle préférence à Firestore
      const docRef = await addDoc(collection(db, 'markerPreferences'), newPreference);
      
      // Recharger les préférences
      await fetchPreferences();
      
      // Activer le mode édition si ce n'est pas déjà le cas
      if (!editMode) {
        toggleEditMode();
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'ajout d\'une nouvelle préférence:', error);
      setError('Erreur lors de l\'ajout d\'une nouvelle préférence');
    } finally {
      setLoading(false);
    }
  };

  const renderMarkerPreview = (preference: MarkerPreference) => {
    const color = editMode 
      ? previewColors[preference.id] || preference.color
      : preference.color;
    
    const icon = editMode 
      ? editingPreferences[preference.id]?.icon || preference.icon
      : preference.icon;
    
    let iconClass = '';
    
    switch (icon) {
      case 'droplet':
        iconClass = 'fas fa-tint';
        break;
      case 'circle':
        iconClass = 'fas fa-circle';
        break;
      case 'square':
        iconClass = 'fas fa-square';
        break;
      case 'triangle':
        iconClass = 'fas fa-caret-up';
        break;
      case 'forward arrow':
        iconClass = 'fas fa-arrow-up';
        break;
      case 'open arrow':
        iconClass = 'far fa-caret-square-up';
        break;
      case 'backward open arrow':
        iconClass = 'far fa-caret-square-down';
        break;
      case 'star':
        iconClass = 'fas fa-star';
        break;
      case 'pin':
        iconClass = 'fas fa-map-marker-alt';
        break;
      case 'gem':
        iconClass = 'fas fa-gem';
        break;
      case 'stop':
        iconClass = 'fas fa-stop';
        break;
      case 'cross':
        iconClass = 'fas fa-times';
        break;
      case 'diamond':
        iconClass = 'fas fa-gem';
        break;
      case 'hexagon':
        iconClass = 'fas fa-stop';
        break;
      default:
        iconClass = 'fas fa-tint';
    }
    
    return (
      <div className="marker-preview" style={{ color }}>
        <i className={iconClass}></i>
      </div>
    );
  };

  // Fonction pour réinitialiser les préférences aux valeurs par défaut
  const handleResetToDefaults = async () => {
    // Confirmation avant réinitialisation
    const confirmMessage = "Êtes-vous sûr de vouloir réinitialiser toutes les préférences de marqueurs aux valeurs par défaut ? Cette action supprimera toutes les personnalisations existantes.";
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      
      // Supprimer toutes les préférences existantes
      const preferencesRef = collection(db, 'markerPreferences');
      const snapshot = await getDocs(preferencesRef);
      
      for (const doc of snapshot.docs) {
        await deleteDoc(doc.ref);
      }
      
      // Créer les préférences par défaut
      await createDefaultPreferences();
      
      // Recharger les préférences
      await fetchPreferences();
      
      // Réinitialiser les sélections
      setSelectedPreferences([]);
      setSelectAll(false);
      
      // Sortir du mode édition si actif
      if (editMode) {
        setEditMode(false);
        setEditingPreferences({});
      }
      
    } catch (error) {
      console.error('Erreur lors de la réinitialisation des préférences:', error);
      setError('Erreur lors de la réinitialisation des préférences');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour rendre un aperçu d'icône spécifique
  const renderIconPreview = (iconType: string) => {
    let iconClass = '';
    
    switch (iconType) {
      case 'droplet':
        iconClass = 'fas fa-tint';
        break;
      case 'circle':
        iconClass = 'fas fa-circle';
        break;
      case 'square':
        iconClass = 'fas fa-square';
        break;
      case 'triangle':
        iconClass = 'fas fa-caret-up';
        break;
      case 'forward arrow':
        iconClass = 'fas fa-arrow-up';
        break;
      case 'open arrow':
        iconClass = 'far fa-caret-square-up';
        break;
      case 'backward open arrow':
        iconClass = 'far fa-caret-square-down';
        break;
      case 'star':
        iconClass = 'fas fa-star';
        break;
      case 'pin':
        iconClass = 'fas fa-map-marker-alt';
        break;
      case 'diamond':
        iconClass = 'fas fa-gem';
        break;
      case 'hexagon':
        iconClass = 'fas fa-stop';
        break;
      case 'cross':
        iconClass = 'fas fa-times';
        break;
      default:
        iconClass = 'fas fa-tint';
    }
    
    return <i className={iconClass}></i>;
  };

  if (loading && preferences.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des préférences de marqueurs...</p>
      </div>
    );
  }

  return (
    <div className="marker-preferences-container">
      <div className="section-header">
        <h2 className="section-title">
          Préférences des marqueurs
          {selectedPreferences.length > 0 && (
            <span className="selection-count"> ({selectedPreferences.length} sélectionné{selectedPreferences.length > 1 ? 's' : ''})</span>
          )}
        </h2>
        <div className="header-actions">
          {editMode ? (
            <>
              <button 
                className="button" 
                onClick={handleSave}
                disabled={loading}
                style={{ 
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              >
                <i className="fas fa-save"></i> Enregistrer
              </button>
              {selectedPreferences.length > 0 && (
                <button 
                  className="button" 
                  onClick={handleDeleteSelected}
                  disabled={loading}
                  style={{ 
                    backgroundColor: '#f44336',
                    color: 'white',
                    marginLeft: '10px'
                  }}
                >
                  <i className="fas fa-trash"></i> Supprimer ({selectedPreferences.length})
                </button>
              )}
              <button 
                className="button" 
                onClick={handleAddPreference}
                disabled={loading}
                style={{ 
                  backgroundColor: '#2196F3',
                  color: 'white',
                  marginLeft: '10px'
                }}
              >
                <i className="fas fa-plus"></i> Ajouter
              </button>
              <button 
                className="button button-secondary" 
                onClick={toggleEditMode}
                style={{ marginLeft: '10px' }}
                disabled={loading}
              >
                <i className="fas fa-times"></i> Annuler
              </button>
            </>
          ) : (
            <>
              <button 
                className="button" 
                onClick={toggleEditMode}
              >
                <i className="fas fa-edit"></i> Modifier
              </button>
              <button 
                className="button button-secondary" 
                onClick={handleResetToDefaults}
                disabled={loading}
                style={{ marginLeft: '10px' }}
              >
                <i className="fas fa-undo"></i> Réinitialiser
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="preferences-table-container">
        <table className="preferences-table">
          <thead>
            <tr>
              {editMode && (
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={selectAll}
                    onChange={handleSelectAllChange}
                    title="Sélectionner/Désélectionner tout"
                    id="select-all-checkbox"
                  />
                  <label htmlFor="select-all-checkbox" className="sr-only">Sélectionner tout</label>
                </th>
              )}
              <th>Aperçu</th>
              <th>Type de site</th>
              <th>Nom affiché</th>
              <th>Couleur</th>
              <th>Icône</th>
            </tr>
          </thead>
          <tbody>
            {preferences.length > 0 ? (
              preferences.map(preference => (
                <tr 
                  key={preference.id}
                  className={selectedPreferences.includes(preference.id) ? 'selected-row' : ''}
                  onClick={editMode ? () => togglePreferenceSelection(preference.id) : undefined}
                  style={editMode ? { cursor: 'pointer' } : undefined}
                >
                  {editMode && (
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedPreferences.includes(preference.id)} 
                        onChange={() => togglePreferenceSelection(preference.id)}
                        title="Sélectionner cette préférence"
                        id={`select-preference-${preference.id}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label htmlFor={`select-preference-${preference.id}`} className="sr-only">
                        Sélectionner {preference.name}
                      </label>
                    </td>
                  )}
                  <td>{renderMarkerPreview(preference)}</td>
                  <td>{preference.siteType}</td>
                  <td>
                    {editMode ? (
                      <input
                        type="text"
                        value={editingPreferences[preference.id]?.name || preference.name}
                        onChange={(e) => handleNameChange(preference.id, e.target.value)}
                        className="edit-input"
                        aria-label={`Nom pour ${preference.siteType}`}
                        placeholder={`Nom pour ${preference.siteType}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      preference.name
                    )}
                  </td>
                  <td>
                    {editMode ? (
                      <select
                        value={editingPreferences[preference.id]?.color || preference.color}
                        onChange={(e) => handleColorChange(preference.id, e.target.value)}
                        className="edit-select"
                        style={{ backgroundColor: previewColors[preference.id] || preference.color, color: '#fff' }}
                        aria-label={`Couleur pour ${preference.siteType}`}
                        title={`Sélectionner une couleur pour ${preference.siteType}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {AVAILABLE_COLORS.map(color => (
                          <option 
                            key={color.value} 
                            value={color.value}
                            style={{ backgroundColor: color.value, color: '#fff' }}
                          >
                            {color.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="color-preview" style={{ backgroundColor: preference.color }}></div>
                    )}
                  </td>
                  <td>
                    {editMode ? (
                      <select
                        value={editingPreferences[preference.id]?.icon || preference.icon}
                        onChange={(e) => handleIconChange(preference.id, e.target.value)}
                        className="edit-select"
                        aria-label={`Icône pour ${preference.siteType}`}
                        title={`Sélectionner une icône pour ${preference.siteType}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {AVAILABLE_ICONS.map(icon => (
                          <option key={icon.value} value={icon.value}>
                            {icon.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      AVAILABLE_ICONS.find(i => i.value === preference.icon)?.name || preference.icon
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={editMode ? 6 : 5} className="no-results">
                  <div className="no-results-message">
                    <i className="fas fa-info-circle"></i>
                    <p>Aucune préférence de marqueur n'est définie</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {selectedPreferences.length > 0 && editMode && (
        <div className="selection-actions">
          <button 
            className="button" 
            onClick={handleDeleteSelected}
            disabled={loading}
            style={{ 
              backgroundColor: '#f44336',
              color: 'white'
            }}
          >
            <i className="fas fa-trash"></i> Supprimer les {selectedPreferences.length} élément{selectedPreferences.length > 1 ? 's' : ''} sélectionné{selectedPreferences.length > 1 ? 's' : ''}
          </button>
        </div>
      )}
      
      <div className="preferences-info">
        <p>
          <i className="fas fa-info-circle"></i> Les modifications des préférences de marqueurs seront appliquées à la carte après l'enregistrement.
        </p>
        <p>
          <i className="fas fa-map-marker-alt"></i> Les icônes sélectionnées déterminent la forme des marqueurs sur Google Maps. Les formes disponibles sont: cercle, carré, triangle, flèches, épingle, étoile, losange, hexagone et croix.
        </p>
        {editMode ? (
          <p>
            <i className="fas fa-lightbulb"></i> Astuce : Cliquez sur une ligne pour la sélectionner rapidement.
          </p>
        ) : (
          <p>
            <i className="fas fa-undo"></i> Vous pouvez réinitialiser toutes les préférences aux valeurs par défaut en cliquant sur le bouton "Réinitialiser".
          </p>
        )}
        
        {/* Prévisualisation des formes disponibles */}
        <div style={{ marginTop: '15px' }}>
          <h4><i className="fas fa-eye"></i> Prévisualisation des formes disponibles</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '10px' }}>
            {AVAILABLE_ICONS.map(icon => (
              <div key={icon.value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px' }}>
                <div style={{ 
                  backgroundColor: '#007aff', 
                  color: 'white', 
                  width: '40px', 
                  height: '40px', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  borderRadius: icon.value === 'circle' ? '50%' : '0'
                }}>
                  {renderIconPreview(icon.value)}
                </div>
                <span style={{ fontSize: '12px', marginTop: '5px', textAlign: 'center' }}>{icon.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkerPreferences; 
