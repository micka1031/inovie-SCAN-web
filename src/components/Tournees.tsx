// @ts-nocheck
import React, { 
  useState, 
  useEffect, 
  ChangeEvent, 
  FormEvent 
} from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../config/firebase';
import DatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import { fr } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import './EditMode.css';
import './Tournees.css';
import ReactDOM from 'react-dom';
import { usePoles } from '../services/PoleService';
import PoleSelector from './PoleSelector';
import PoleFilter from './PoleFilter';

// Enregistrer la locale française
registerLocale('fr', fr);

interface Tournee {
  id: string;
  nom: string;
  date: Timestamp;
  heureDepart: string;
  heureFinPrevue: string;
  heureFinReelle?: string;
  coursier: string;
  vehicules: string[];
  nombreColis: number;
  statut: 'en_attente' | 'en_cours' | 'terminee' | 'annulee';
  siteDepart: string;
  pole?: string;
}

interface Vehicule {
  id: string;
  immatriculation: string;
}

interface Site {
  id: string;
  nom: string;
}

const Tournees: React.FC = () => {
  const [tournees, setTournees] = useState<Tournee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // État pour le modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentTournee, setCurrentTournee] = useState<Partial<Tournee>>({
    nom: '',
    heureDepart: '',
    heureFinPrevue: '',
    heureFinReelle: '',
    coursier: '',
    vehicules: [],
    nombreColis: 0,
    statut: 'en_attente',
  });

  // État pour le mode édition et la sélection multiple
  const [editMode, setEditMode] = useState<boolean>(false);
  const [selectedTournees, setSelectedTournees] = useState<string[]>([]);
  const [editingTournees, setEditingTournees] = useState<{[key: string]: Tournee}>({});
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectAll, setSelectAll] = useState<boolean>(false);

  // Ajouter un nouvel état pour les nouvelles tournées temporaires
  const [newTournees, setNewTournees] = useState<Partial<Tournee>[]>([]);
  
  // État pour la recherche rapide
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [filteredTournees, setFilteredTournees] = useState<Tournee[]>([]);

  // Ajout du filtre par pôle
  const [selectedPole, setSelectedPole] = useState<string>('');

  // Utilisation du hook usePoles
  const { poles } = usePoles();
  
  // Fonction pour obtenir le nom du pôle
  const getPoleNameById = (poleId: string | undefined): string => {
    if (!poleId) return '-';
    const pole = poles.find(p => p.id === poleId);
    return pole ? pole.nom : poleId;
  };

  useEffect(() => {
    fetchTournees();
    fetchVehicules();
    fetchSites();
  }, []);

  // Initialiser les tournées filtrées au chargement
  useEffect(() => {
    setFilteredTournees(tournees);
  }, [tournees]);

  // Effet pour filtrer les tournées en fonction de la recherche rapide et du pôle sélectionné
  useEffect(() => {
    let results = tournees;

    // Filtrer par pôle si un pôle est sélectionné
    if (selectedPole) {
      results = results.filter(tournee => tournee.pole === selectedPole);
    }

    // Ensuite filtrer par recherche rapide
    if (quickSearch.trim()) {
      const searchTerm = quickSearch.toLowerCase().trim();
      results = results.filter(tournee => {
        // Rechercher dans tous les champs textuels de la tournée
        return (
          tournee.nom.toLowerCase().includes(searchTerm) ||
          tournee.heureDepart.toLowerCase().includes(searchTerm) ||
          (tournee.heureFinReelle || '').toLowerCase().includes(searchTerm) ||
          tournee.statut.toLowerCase().includes(searchTerm) ||
          tournee.vehicules.some(vehiculeId => {
            const vehicule = vehicules.find(v => v.id === vehiculeId);
            return vehicule && vehicule.immatriculation.toLowerCase().includes(searchTerm);
          })
        );
      });
    }

    setFilteredTournees(results);
  }, [quickSearch, tournees, vehicules, selectedPole]);

  // Effet pour gérer la sélection/désélection de toutes les tournées
  useEffect(() => {
    if (selectAll) {
      setSelectedTournees(tournees.map(tournee => tournee.id));
    } else if (selectedTournees.length === tournees.length) {
      // Si toutes les tournées sont sélectionnées mais que selectAll est false, cela signifie que l'utilisateur a désélectionné
      setSelectedTournees([]);
    }
  }, [selectAll]);

  const fetchTournees = async () => {
    try {
      setLoading(true);
      
      const tourneesRef = collection(db, 'tournees');
      const snapshot = await getDocs(tourneesRef);
      
      if (!snapshot.empty) {
        const tourneesData: Tournee[] = snapshot.docs.map((doc: DocumentSnapshot<DocumentData>) => {
          const data = doc.data() as Tournee;
          return {
            id: doc.id,
            nom: data?.nom || '',
            heureDepart: data?.heureDepart || '',
            heureFinPrevue: data?.heureFinPrevue || '',
            heureFinReelle: data?.heureFinReelle || '',
            coursier: data?.coursier || '',
            vehicules: data?.vehicules || [],
            nombreColis: data?.nombreColis || 0,
            statut: data?.statut || 'en_attente',
            pole: data?.pole || '',
            siteDepart: data?.siteDepart || ''
          };
        });
        
        console.log("Tournées récupérées depuis Firestore:", tourneesData);
        setTournees(tourneesData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des tournées:', error);
      setError('Erreur lors de la récupération des données');
      setTournees([]);
      setLoading(false);
    }
  };

  const fetchVehicules = async () => {
    try {
      const vehiculesRef = collection(db, 'vehicules');
      const snapshot = await getDocs(vehiculesRef);
      
      if (!snapshot.empty) {
        const vehiculesData: Vehicule[] = snapshot.docs.map((doc: DocumentSnapshot<DocumentData>) => {
          const data = doc.data() as Vehicule;
          return {
            id: doc.id,
            immatriculation: data?.immatriculation || ''
          };
        });
        
        setVehicules(vehiculesData);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des véhicules:', error);
    }
  };

  const fetchSites = async () => {
    try {
      const sitesRef = collection(db, 'sites');
      const snapshot = await getDocs(sitesRef);
      
      if (!snapshot.empty) {
        const sitesData: Site[] = snapshot.docs.map((doc: DocumentSnapshot<DocumentData>) => {
          const data = doc.data() as Site;
          return {
            id: doc.id,
            nom: data?.nom || ''
          };
        });
        
        setSites(sitesData);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des sites:', error);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'nombreColis') {
      setCurrentTournee((prev: Partial<Tournee>) => ({ 
        ...prev, 
        [name]: parseInt(value, 10) 
      }));
    } else if (name === 'vehicules') {
      const selectedVehicules = Array.from(
        (e.target as HTMLSelectElement).selectedOptions, 
        option => option.value
      );
      setCurrentTournee((prev: Partial<Tournee>) => ({ 
        ...prev, 
        vehicules: selectedVehicules 
      }));
    } else {
      setCurrentTournee((prev: Partial<Tournee>) => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateOrUpdateTournee = async () => {
    try {
      const tourneeToSave: Tournee = {
        ...currentTournee,
        id: currentTournee.id || '',
        heureDepart: currentTournee.heureDepart || '',
        heureFinPrevue: currentTournee.heureFinPrevue || '',
        heureFinReelle: currentTournee.heureFinReelle || '',
        coursier: currentTournee.coursier || '',
        vehicules: currentTournee.vehicules || [],
        nombreColis: currentTournee.nombreColis || 0,
        statut: currentTournee.statut || 'en_attente',
      } as Tournee;

      if (isEditing) {
        await updateDoc(doc(db, 'tournees', tourneeToSave.id), {
          ...tourneeToSave,
        });
      } else {
        await addDoc(collection(db, 'tournees'), {
          ...tourneeToSave,
        });
      }

      fetchTournees();
      closeModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la tournée', error);
      setError('Erreur lors de la sauvegarde de la tournée');
    }
  };

  const handleEdit = (tournee: Tournee) => {
    setCurrentTournee(tournee);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDeleteSelected = async () => {
    if (selectedTournees.length === 0) {
      alert('Veuillez sélectionner au moins une tournée à supprimer');
      return;
    }

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedTournees.length} tournée(s) ?`)) {
      try {
        // Supprimer les tournées sélectionnées de Firestore
        const deletePromises = selectedTournees.map(id => deleteDoc(doc(db, 'tournees', id)));
        await Promise.all(deletePromises);
        
        // Mettre à jour l'état local
        setTournees(tournees.filter(tournee => !selectedTournees.includes(tournee.id)));
        setSelectedTournees([]);
        setSelectAll(false);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        setError('Erreur lors de la suppression');
      }
    }
  };

  // Fonction pour gérer la sélection/désélection de toutes les tournées
  const handleSelectAllChange = () => {
    setSelectAll(!selectAll);
  };

  const toggleEditMode = () => {
    if (editMode) {
      // Si on quitte le mode édition, réinitialiser les sélections et les modifications
      setSelectedTournees([]);
      setEditingTournees({});
      setSelectAll(false);
      setNewTournees([]);
      
      // Rafraîchir les données depuis Firebase
      fetchTournees();
    } else {
      // Si on entre en mode édition, initialiser les sites en édition
      const editingTourneesObj: {[key: string]: Tournee} = {};
      filteredTournees.forEach(tournee => {
        editingTourneesObj[tournee.id] = { ...tournee };
      });
      setEditingTournees(editingTourneesObj);
    }
    
    // Inverser le mode édition
    setEditMode(!editMode);
    
    // Réinitialiser la recherche rapide et les filtres
    setQuickSearch('');
    setSelectedPole('');
  };

  const toggleTourneeSelection = (id: string) => {
    if (selectedTournees.includes(id)) {
      setSelectedTournees(selectedTournees.filter(tourneeId => tourneeId !== id));
      // Si on désélectionne une tournée, on désactive aussi "Tout sélectionner"
      setSelectAll(false);
    } else {
      setSelectedTournees([...selectedTournees, id]);
      // Si toutes les tournées sont sélectionnées, on active "Tout sélectionner"
      if (selectedTournees.length + 1 === tournees.length) {
        setSelectAll(true);
      }
    }
  };

  const formatDate = (date: Date | Timestamp | null) => {
    if (!date) return '';
    
    try {
      // Si c'est un Timestamp
      if (date instanceof Timestamp) {
        return date.toDate().toLocaleDateString('fr-FR');
      }
      
      // Si c'est une Date
      if (date instanceof Date) {
        return date.toLocaleDateString('fr-FR');
      }
      
      return '';
    } catch (error) {
      console.error('Erreur lors du formatage de la date:', error);
      return '';
    }
  };

  const convertTimestampToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    try {
      if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la conversion du timestamp:', error);
      return null;
    }
  };

  const getStatusClass = (statut: string) => {
    switch (statut) {
      case 'en_attente':
        return 'en-attente';
      case 'en_cours':
        return 'en-cours';
      case 'terminee':
        return 'livré';
      case 'annulee':
        return 'annulé';
      default:
        return '';
    }
  };

  const getStatusText = (statut: string) => {
    switch (statut) {
      case 'en_attente':
        return 'En attente';
      case 'en_cours':
        return 'En cours';
      case 'terminee':
        return 'Terminée';
      case 'annulee':
        return 'Annulée';
      default:
        return '';
    }
  };

  const addNewTourneeRow = () => {
    // Forcer le mode édition si ce n'est pas déjà le cas
    if (!editMode) {
      setEditMode(true);
    }

    const newTournee: Partial<Tournee> = {
      id: `temp-${Date.now()}`, // Identifiant temporaire unique
      nom: '',
      heureDepart: '',
      heureFinPrevue: '',
      heureFinReelle: '',
      coursier: '',
      vehicules: [],
      nombreColis: 0,
      statut: 'en_attente',
    };
    
    // Ajouter la nouvelle ligne au début du tableau
    setNewTournees(prevNewTournees => [newTournee, ...prevNewTournees]);
    
    // Ajouter un délai pour permettre le rendu
    setTimeout(() => {
      const firstInput = document.querySelector('.tournees-table-container .new-tournee-row input') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  };

  const handleNewTourneeChange = (index: number, field: keyof Tournee, value: any) => {
    const updatedNewTournees = [...newTournees];
    updatedNewTournees[index] = {
      ...updatedNewTournees[index],
      [field]: value
    };
    setNewTournees(updatedNewTournees);
  };

  const removeNewTourneeRow = (index: number) => {
    const updatedNewTournees = newTournees.filter((_, i) => i !== index);
    setNewTournees(updatedNewTournees);
  };

  const saveAllChanges = async () => {
    try {
      console.log("Début de la sauvegarde des modifications...");
      console.log("Tournées à mettre à jour:", Object.keys(editingTournees).length);
      console.log("Nouvelles tournées à ajouter:", newTournees.length);
      
      // Mettre à jour les tournées existantes
      const updatePromises = Object.entries(editingTournees).map(async ([id, tournee]) => {
        try {
          console.log(`Mise à jour de la tournée ${id}:`, tournee);
          
          // Créer un objet avec uniquement les champs définis
          const updateData: Partial<Tournee> = {};
          
          // Vérifier et ajouter chaque champ s'il est défini
          if (tournee.nom !== undefined) updateData.nom = tournee.nom;
          if (tournee.heureDepart !== undefined) updateData.heureDepart = tournee.heureDepart;
          if (tournee.heureFinPrevue !== undefined) updateData.heureFinPrevue = tournee.heureFinPrevue;
          if (tournee.heureFinReelle !== undefined) updateData.heureFinReelle = tournee.heureFinReelle;
          if (tournee.coursier !== undefined) updateData.coursier = tournee.coursier;
          if (tournee.vehicules !== undefined) updateData.vehicules = tournee.vehicules;
          if (tournee.nombreColis !== undefined) updateData.nombreColis = tournee.nombreColis;
          if (tournee.statut !== undefined) updateData.statut = tournee.statut;
          if (tournee.pole !== undefined) updateData.pole = tournee.pole;
          
          await updateDoc(doc(db, 'tournees', id), updateData);
          console.log(`Tournée ${id} mise à jour avec succès`);
          return id;
        } catch (error) {
          console.error(`Erreur lors de la mise à jour de la tournée ${id}:`, error);
          throw error;
        }
      });

      // Ajouter les nouvelles tournées
      const addPromises = newTournees.map(async (newTournee, index) => {
        try {
          console.log(`Ajout de la nouvelle tournée à l'index ${index}:`, newTournee);
          
          // Supprimer l'ID temporaire avant l'ajout
          const { id, ...tourneeToAdd } = newTournee;
          
          // S'assurer que tous les champs requis sont présents
          const tourneeComplete = {
            ...tourneeToAdd,
            vehicules: tourneeToAdd.vehicules || [],
            nombreColis: tourneeToAdd.nombreColis || 0,
            statut: tourneeToAdd.statut || 'en_attente'
          };
          
          const docRef = await addDoc(collection(db, 'tournees'), tourneeComplete);
          console.log(`Nouvelle tournée ajoutée avec l'ID: ${docRef.id}`);
          return docRef.id;
        } catch (error) {
          console.error(`Erreur lors de l'ajout de la nouvelle tournée à l'index ${index}:`, error);
          throw error;
        }
      });

      // Attendre que toutes les opérations soient terminées
      const results = await Promise.allSettled([...updatePromises, ...addPromises]);
      
      // Vérifier les résultats
      const fulfilled = results.filter(result => result.status === 'fulfilled').length;
      const rejected = results.filter(result => result.status === 'rejected').length;
      
      console.log(`Opérations terminées: ${fulfilled} réussies, ${rejected} échouées`);
      
      if (rejected > 0) {
        console.warn("Certaines opérations ont échoué. Voir les erreurs ci-dessus.");
      }
      
      // Réinitialiser les états
      setEditingTournees({});
      setNewTournees([]);
      
      // Recharger les tournées
      await fetchTournees();
      
      if (rejected > 0) {
        alert(`Modifications partiellement enregistrées. ${rejected} opérations ont échoué.`);
      } else {
        alert('Modifications enregistrées avec succès');
      }
      
      // Désactiver le mode édition après sauvegarde réussie
      setEditMode(false);
      setSelectedTournees([]);
      setSelectAll(false);
      
      console.log('Toutes les modifications ont été enregistrées avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des modifications:', error);
      alert('Erreur lors de la sauvegarde des modifications. Veuillez réessayer.');
      throw error;
    }
  };

  const handleCellChange = (id: string, field: keyof Tournee, value: any) => {
    console.log(`Mise à jour de la tournée ${id}, champ ${field} avec la valeur:`, value);
    setEditingTournees({
      ...editingTournees,
      [id]: {
        ...editingTournees[id],
        [field]: value
      }
    });
  };

  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setCurrentTournee({
      nom: '',
      heureDepart: '',
      heureFinPrevue: '',
      heureFinReelle: '',
      coursier: '',
      vehicules: [],
      nombreColis: 0,
      statut: 'en_attente',
    });
  };

  // Fonction pour gérer le changement de pôle
  const handlePoleChange = (pole: string) => {
    setSelectedPole(pole);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des tournées...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Tournées</h2>
      </div>
      
      <div className="sticky-header-container">
        <div className="header-actions">
          {editMode ? (
            <>
              <button 
                className="button" 
                onClick={saveAllChanges}
                disabled={loading || (selectedTournees.length === 0 && newTournees.length === 0)}
                style={{ 
                  backgroundColor: '#4CAF50', // Vert
                  color: 'white',
                  fontWeight: 'bold'
                }}
                title="Enregistrer les modifications"
              >
                <i className="fas fa-save"></i> Enr. {selectedTournees.length > 0 || newTournees.length > 0 ? 
                  `(${selectedTournees.length}${newTournees.length > 0 ? `+${newTournees.length}` : ''})` : 
                  ''}
              </button>
              <button 
                className="button button-secondary" 
                onClick={() => {
                  if (window.confirm("Êtes-vous sûr de vouloir annuler toutes les modifications ?")) {
                    setEditingTournees({});
                    setNewTournees([]);
                    setSelectedTournees([]);
                    setSelectAll(false);
                    setEditMode(false);
                  }
                }}
                style={{ marginLeft: '5px' }}
                disabled={loading}
                title="Annuler les modifications"
              >
                <i className="fas fa-times"></i> Annuler
              </button>
              <button 
                className="button" 
                onClick={addNewTourneeRow}
                style={{ 
                  marginLeft: '5px',
                  backgroundColor: '#FF9800', // Orange
                  color: 'white',
                  fontWeight: 'bold'
                }}
                disabled={loading}
                title="Ajouter une nouvelle tournée"
              >
                <i className="fas fa-plus"></i> Ajouter
              </button>
              <button 
                className="button button-danger" 
                onClick={handleDeleteSelected}
                disabled={selectedTournees.length === 0 || loading}
                style={{ 
                  marginLeft: '5px',
                  backgroundColor: '#f44336', 
                  color: 'white',
                  fontWeight: 'bold'
                }}
                title="Supprimer les tournées sélectionnées"
              >
                <i className="fas fa-trash-alt"></i> Sup. ({selectedTournees.length})
              </button>
            </>
          ) : (
            <button 
              className="button" 
              onClick={toggleEditMode}
            >
              <i className="fas fa-edit"></i> Modifier
            </button>
          )}
        </div>
        
        <div className="quick-search-container" style={{ marginTop: '10px' }}>
          <input
            type="text"
            className="quick-search-input"
            placeholder="Recherche rapide..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            disabled={loading}
          />
          <div className="pole-filter">
            <PoleFilter
              onPoleChange={handlePoleChange}
              selectedPole={selectedPole}
              label="Filtrer par pôle"
              className="pole-filter-component"
            />
          </div>
        </div>
      </div>
      
      <div className="tournees-table-container" style={{ overflowX: 'auto' }}>
        <div className="results-info">
          <p>{filteredTournees.length} résultat(s) trouvé(s){quickSearch ? ` pour la recherche "${quickSearch}"` : ''}</p>
        </div>
        <table className={`data-table ${editMode ? 'editing' : ''}`}>
          <thead>
            <tr>
              {editMode && (
                <th>
                  <input 
                    type="checkbox" 
                    checked={selectAll}
                    onChange={handleSelectAllChange}
                    title="Sélectionner/Désélectionner toutes les tournées"
                  />
                </th>
              )}
              <th>PÔLE</th>
              <th>Nom</th>
              <th>Heure de Départ</th>
              <th>Heure d'Arrivée</th>
              <th>Véhicules</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {/* Nouvelles lignes temporaires */}
            {editMode && newTournees.map((newTournee, index) => (
              <tr key={newTournee.id} className="new-tournee-row">
                <td style={{display: 'none'}}>
                  {/* Cellule masquée pour maintenir l'alignement */}
                </td>
                <td>
                  <PoleSelector
                    value={newTournee.pole || ''}
                    onChange={(value) => handleNewTourneeChange(index, 'pole', value)}
                    placeholder="Sélectionner un pôle"
                    style={{ width: '100%' }}
                    showSearch
                    allowClear
                    title="Pôle de la tournée"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={newTournee.nom || ''}
                    onChange={(e) => handleNewTourneeChange(index, 'nom', e.target.value)}
                    className="inline-edit-input"
                    placeholder="Nom de la tournée"
                  />
                </td>
                <td style={{ position: 'relative' }}>
                  <div className="custom-datepicker-wrapper">
                    <DatePicker
                      selected={newTournee.heureDepart ? new Date(`2000-01-01T${newTournee.heureDepart}`) : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const hours = date.getHours().toString().padStart(2, '0');
                          const minutes = date.getMinutes().toString().padStart(2, '0');
                          handleNewTourneeChange(index, 'heureDepart', `${hours}:${minutes}`);
                        }
                      }}
                      locale="fr"
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={15}
                      timeCaption="Heure"
                      dateFormat="HH:mm"
                      placeholderText="HH:MM"
                      className="custom-datepicker-input"
                      popperPlacement="bottom-start"
                      popperModifiers={[
                        {
                          name: 'offset',
                          options: {
                            offset: [0, 8],
                          },
                          fn: (state) => state
                        },
                      ]}
                    />
                    <span className="custom-datepicker-icon">🕒</span>
                  </div>
                </td>
                <td style={{ position: 'relative' }}>
                  <div className="custom-datepicker-wrapper">
                    <DatePicker
                      selected={newTournee.heureFinReelle ? new Date(`2000-01-01T${newTournee.heureFinReelle}`) : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const hours = date.getHours().toString().padStart(2, '0');
                          const minutes = date.getMinutes().toString().padStart(2, '0');
                          handleNewTourneeChange(index, 'heureFinReelle', `${hours}:${minutes}`);
                        }
                      }}
                      locale="fr"
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={15}
                      timeCaption="Heure"
                      dateFormat="HH:mm"
                      placeholderText="HH:MM"
                      className="custom-datepicker-input"
                      popperPlacement="bottom-start"
                      popperModifiers={[
                        {
                          name: 'offset',
                          options: {
                            offset: [0, 8],
                          },
                          fn: (state) => state
                        },
                      ]}
                    />
                    <span className="custom-datepicker-icon">🕒</span>
                  </div>
                </td>
                <td>
                  <div className="checkbox-list" style={{ 
                    maxHeight: '150px', 
                    overflowY: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '8px',
                    backgroundColor: '#f9f9f9'
                  }}>
                    {vehicules.map(vehicule => (
                      <div key={vehicule.id} style={{ marginBottom: '6px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={(newTournee.vehicules || []).includes(vehicule.id)}
                            onChange={(e) => {
                              const currentVehicules = [...(newTournee.vehicules || [])];
                              if (e.target.checked) {
                                // Ajouter le véhicule s'il n'est pas déjà présent
                                if (!currentVehicules.includes(vehicule.id)) {
                                  handleNewTourneeChange(index, 'vehicules', [...currentVehicules, vehicule.id]);
                                }
                              } else {
                                // Retirer le véhicule
                                handleNewTourneeChange(index, 'vehicules', currentVehicules.filter(id => id !== vehicule.id));
                              }
                            }}
                            style={{ marginRight: '8px' }}
                            title={`Sélectionner le véhicule ${vehicule.immatriculation}`}
                          />
                          {vehicule.immatriculation}
                        </label>
                      </div>
                    ))}
                  </div>
                </td>
                <td>
                  <select
                    value={newTournee.statut || 'en_attente'}
                    onChange={(e) => handleNewTourneeChange(index, 'statut', e.target.value)}
                    className="inline-edit-select"
                    title="Statut de la tournée"
                  >
                    <option value="en_attente">En attente</option>
                    <option value="en_cours">En cours</option>
                    <option value="terminee">Terminée</option>
                    <option value="annulee">Annulée</option>
                  </select>
                </td>
              </tr>
            ))}

            {filteredTournees.map((tournee) => (
              <tr key={tournee.id} className={selectedTournees.includes(tournee.id) ? 'selected-row' : ''}>
                {editMode && (
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedTournees.includes(tournee.id)} 
                      onChange={() => toggleTourneeSelection(tournee.id)}
                      title={`Sélectionner la tournée ${tournee.nom}`}
                    />
                  </td>
                )}
                <td>
                  {editMode ? (
                    <PoleSelector
                      value={editingTournees[tournee.id]?.pole || tournee.pole || ''}
                      onChange={(value) => handleCellChange(tournee.id, 'pole', value)}
                      placeholder="Sélectionner un pôle"
                      style={{ width: '100%' }}
                      showSearch
                      allowClear
                      title="Pôle de la tournée"
                    />
                  ) : (
                    getPoleNameById(tournee.pole)
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="text"
                      value={editingTournees[tournee.id]?.nom || tournee.nom}
                      onChange={(e) => handleCellChange(tournee.id, 'nom', e.target.value)}
                      className="inline-edit-input"
                      placeholder="Nom de la tournée"
                    />
                  ) : (
                    tournee.nom
                  )}
                </td>
                <td style={{ position: 'relative' }}>
                  {editMode ? (
                    <div className="custom-datepicker-wrapper">
                      <DatePicker
                        selected={editingTournees[tournee.id]?.heureDepart ? new Date(`2000-01-01T${editingTournees[tournee.id].heureDepart}`) : tournee.heureDepart ? new Date(`2000-01-01T${tournee.heureDepart}`) : null}
                        onChange={(date: Date | null) => {
                          if (date) {
                            const hours = date.getHours().toString().padStart(2, '0');
                            const minutes = date.getMinutes().toString().padStart(2, '0');
                            handleCellChange(tournee.id, 'heureDepart', `${hours}:${minutes}`);
                          }
                        }}
                        locale="fr"
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Heure"
                        dateFormat="HH:mm"
                        placeholderText="HH:MM"
                        className="custom-datepicker-input"
                        popperPlacement="bottom-start"
                        popperModifiers={[
                          {
                            name: 'offset',
                            options: {
                              offset: [0, 8],
                            },
                            fn: (state) => state
                          },
                        ]}
                      />
                      <span className="custom-datepicker-icon">🕒</span>
                    </div>
                  ) : (
                    tournee.heureDepart || '-'
                  )}
                </td>
                <td style={{ position: 'relative' }}>
                  {editMode ? (
                    <div className="custom-datepicker-wrapper">
                      <DatePicker
                        selected={editingTournees[tournee.id]?.heureFinReelle ? new Date(`2000-01-01T${editingTournees[tournee.id].heureFinReelle}`) : tournee.heureFinReelle ? new Date(`2000-01-01T${tournee.heureFinReelle}`) : null}
                        onChange={(date: Date | null) => {
                          if (date) {
                            const hours = date.getHours().toString().padStart(2, '0');
                            const minutes = date.getMinutes().toString().padStart(2, '0');
                            handleCellChange(tournee.id, 'heureFinReelle', `${hours}:${minutes}`);
                          }
                        }}
                        locale="fr"
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Heure"
                        dateFormat="HH:mm"
                        placeholderText="HH:MM"
                        className="custom-datepicker-input"
                        popperPlacement="bottom-start"
                        popperModifiers={[
                          {
                            name: 'offset',
                            options: {
                              offset: [0, 8],
                            },
                            fn: (state) => state
                          },
                        ]}
                      />
                      <span className="custom-datepicker-icon">🕒</span>
                    </div>
                  ) : (
                    tournee.heureFinReelle || '-'
                  )}
                </td>
                <td>
                  {editMode ? (
                    <div className="checkbox-list" style={{ 
                      maxHeight: '150px', 
                      overflowY: 'auto',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      padding: '8px',
                      backgroundColor: '#f9f9f9'
                    }}>
                      {vehicules.map(vehicule => (
                        <div key={vehicule.id} style={{ marginBottom: '6px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={(editingTournees[tournee.id]?.vehicules || tournee.vehicules).includes(vehicule.id)}
                              onChange={(e) => {
                                const currentVehicules = [...(editingTournees[tournee.id]?.vehicules || tournee.vehicules)];
                                if (e.target.checked) {
                                  // Ajouter le véhicule s'il n'est pas déjà présent
                                  if (!currentVehicules.includes(vehicule.id)) {
                                    handleCellChange(tournee.id, 'vehicules', [...currentVehicules, vehicule.id]);
                                  }
                                } else {
                                  // Retirer le véhicule
                                  handleCellChange(tournee.id, 'vehicules', currentVehicules.filter(id => id !== vehicule.id));
                                }
                              }}
                              style={{ marginRight: '8px' }}
                            />
                            {vehicule.immatriculation}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    tournee.vehicules.map(vehiculeId => {
                      const vehicule = vehicules.find(v => v.id === vehiculeId);
                      return vehicule ? vehicule.immatriculation : vehiculeId;
                    }).join(', ')
                  )}
                </td>
                <td>
                  {editMode ? (
                    <select
                      value={editingTournees[tournee.id]?.statut || tournee.statut}
                      onChange={(e) => handleCellChange(tournee.id, 'statut', e.target.value as 'en_attente' | 'en_cours' | 'terminee' | 'annulee')}
                      className="inline-edit-select"
                      title="Statut de la tournée"
                    >
                      <option value="en_attente">En attente</option>
                      <option value="en_cours">En cours</option>
                      <option value="terminee">Terminée</option>
                      <option value="annulee">Annulée</option>
                    </select>
                  ) : (
                    <span className={getStatusClass(tournee.statut)}>
                      {getStatusText(tournee.statut)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Tournees;
