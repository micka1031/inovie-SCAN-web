import React, { useState, useEffect } from 'react';
import { Table, Checkbox, Select, Switch, Input, Tag, Tooltip } from 'antd';
import { 
  FaEdit, 
  FaPlus, 
  FaSave, 
  FaTimes, 
  FaTrash, 
  FaFileExport, 
  FaCheckCircle, 
  FaTimesCircle,
  FaUser,
  FaUsers,
  FaLock,
  FaLockOpen,
  FaKey
} from 'react-icons/fa';
import { SELAS } from '../types/SELAS';
import { SELASService } from '../services/SELASService';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';
import './SELASManagement.css';
import './DataTable.css';
import './EditMode.css';

// Type pour les utilisateurs
interface User {
  id: string;
  nom: string;
  email: string;
  role?: string;
}

const SELASManagement: React.FC = () => {
  const [selas, setSelas] = useState<SELAS[]>([]);
  const [filteredSelas, setFilteredSelas] = useState<SELAS[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingSelas, setEditingSelas] = useState<{[key: string]: SELAS}>({});
  const [newSelas, setNewSelas] = useState<Partial<SELAS> | null>(null);
  const [selectedSelas, setSelectedSelas] = useState<string[]>([]);
  const [quickSearch, setQuickSearch] = useState('');
  const [adminAction, setAdminAction] = useState<'default' | 'bulk' | 'export'>('default');
  const [bulkActionType, setBulkActionType] = useState<'activate' | 'deactivate' | 'delete'>('activate');
  
  // Nouvel état pour les utilisateurs disponibles
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  
  const selasService = SELASService.getInstance();

  useEffect(() => {
    fetchSELAS();
  }, []);

  // Initialiser les SELAS filtrées au chargement
  useEffect(() => {
    setFilteredSelas(selas);
  }, [selas]);

  // Effet pour filtrer les SELAS en fonction de la recherche rapide
  useEffect(() => {
    if (!quickSearch.trim()) {
      setFilteredSelas(selas);
      return;
    }

    const searchTerm = quickSearch.toLowerCase().trim();
    const results = selas.filter(sela => {
      return (
        (sela.nom || '').toLowerCase().includes(searchTerm) ||
        (sela.description || '').toLowerCase().includes(searchTerm) ||
        (sela.code || '').toLowerCase().includes(searchTerm)
      );
    });

    setFilteredSelas(results);
  }, [quickSearch, selas]);

  // Ajouter l'effet pour charger les utilisateurs
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchSELAS = async () => {
    try {
      setLoading(true);
      const selasData = await selasService.getSELAS();
      setSelas(selasData);
      setLoading(false);
    } catch (err) {
      setError('Erreur lors du chargement des SELAS');
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Récupérer tous les utilisateurs depuis Firestore
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      const usersList = usersSnapshot.docs
        .filter(doc => doc.data().statut !== 'Inactif') // Optionnel: filtrer les utilisateurs inactifs
        .map(doc => ({
          id: doc.id,
          nom: doc.data().nom || 'Sans nom',
          email: doc.data().email || '',
          role: doc.data().role || ''
        }));
      
      setAvailableUsers(usersList);
      console.log('Utilisateurs chargés:', usersList.length);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      setError('Erreur lors du chargement des utilisateurs');
    }
  };

  const handleEdit = (id: string, field: string, value: any) => {
    // Si c'est la nouvelle SELAS temporaire, mettre à jour l'état newSelas
    if (id === 'new-selas-temp') {
      handleNewSelasChange(field, value);
      return;
    }
    
    // Sinon, mettre à jour une SELAS existante
    setSelas(prev => 
      prev.map(sela => 
        sela.id === id 
          ? { ...sela, [field]: value }
          : sela
      )
    );
  };

  const handleNewSelasChange = (field: string, value: any) => {
    setNewSelas(prev => {
      const updated = { ...(prev || {}) };
      
      if (field.startsWith('accesPages.')) {
        const pageKey = field.split('.')[1];
        updated.accesPages = {
          ...(updated.accesPages || {
            dashboard: true,
            passages: false,
            sites: false,
            tournees: false,
            vehicules: false,
            map: false,
            userManagement: false,
            adminPanel: false
          }),
          [pageKey]: value
        };
      } else {
        // Type-safe key check
        const selasKeys = ['nom', 'description', 'code', 'active', 'sitesAutorises'] as const;
        const typedField = field as typeof selasKeys[number];
        
        if (selasKeys.includes(typedField)) {
          (updated as any)[typedField] = value;
        }
      }
      
      return updated;
    });
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mettre à jour les SELAS existantes
      const updatePromises = selas.map(sela => selasService.updateSELAS(sela.id, sela));
      
      // Ajouter une nouvelle SELAS si nécessaire
      if (newSelas && newSelas.nom) {
        // Valider les champs obligatoires
        if (!newSelas.nom) {
          setError('Le nom de la SELAS est obligatoire');
          setLoading(false);
          return;
        }
        
        // Préparer l'objet avec les valeurs par défaut pour les champs manquants
        const completeSelas: Omit<SELAS, 'id' | 'dateCreation' | 'dateModification'> = {
          nom: newSelas.nom,
          description: newSelas.description || '',
          code: newSelas.code || '',
          active: newSelas.active !== undefined ? newSelas.active : true,
          accesPages: newSelas.accesPages || {
            dashboard: true,
            passages: false,
            sites: false,
            tournees: false,
            vehicules: false,
            map: false,
            userManagement: false,
            adminPanel: false
          },
          sitesAutorises: newSelas.sitesAutorises || []
        };
        
        await selasService.addSELAS(completeSelas);
      }
      
      // Attendre que toutes les mises à jour soient terminées
      await Promise.all(updatePromises);
      
      // Réinitialiser les états
      setEditMode(false);
      setEditingSelas({});
      setNewSelas(null);
      setSelectedSelas([]);
      
      // Recharger les données
      await fetchSELAS();
    } catch (err) {
      setError('Erreur lors de la sauvegarde des modifications');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditingSelas({});
    setNewSelas(null);
    setSelectedSelas([]);
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedSelas.length} SELAS ?`)) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const deletePromises = selectedSelas.map(id => selasService.deleteSELAS(id));
      await Promise.all(deletePromises);
      
      setEditMode(false);
      setSelectedSelas([]);
      
      await fetchSELAS();
    } catch (err) {
      setError('Erreur lors de la suppression des SELAS');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectSelas = (id: string) => {
    // Si c'est la nouvelle SELAS temporaire, ne rien faire car elle n'est pas encore sauvegardée
    if (id === 'new-selas-temp') {
      return;
    }
    
    setSelectedSelas(prev => 
      prev.includes(id) 
        ? prev.filter(selasId => selasId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSelas.length === filteredSelas.length) {
      setSelectedSelas([]);
    } else {
      setSelectedSelas(filteredSelas.map(sela => sela.id));
    }
  };

  const selasToRender = [...filteredSelas];
  
  // Après cette ligne, ajoutons la nouvelle SELAS au tableau s'il y en a une
  if (editMode && newSelas) {
    // Créer un objet SELAS temporaire pour l'affichage
    const tempNewSelas: SELAS = {
      id: 'new-selas-temp',  // ID temporaire
      nom: newSelas.nom || '',
      description: newSelas.description || '',
      code: newSelas.code || '',
      active: newSelas.active !== undefined ? newSelas.active : true,
      accesPages: newSelas.accesPages || {
        dashboard: true,
        passages: false,
        sites: false,
        tournees: false,
        vehicules: false,
        map: false,
        userManagement: false,
        adminPanel: false
      },
      sitesAutorises: newSelas.sitesAutorises || [],
      dateCreation: new Date().toISOString(),
      dateModification: new Date().toISOString()
    };
    
    // Si tempNewSelas a besoin de la propriété utilisateurs (qui semble ne pas être définie dans le type SELAS),
    // nous devons l'ajouter à l'objet après sa création, en utilisant une assertion de type
    (tempNewSelas as any).utilisateurs = [];
    
    // Ajouter la nouvelle SELAS en haut du tableau
    selasToRender.unshift(tempNewSelas);
  }

  const handleBulkAction = async () => {
    try {
      setLoading(true);
      switch (bulkActionType) {
        case 'activate':
          await Promise.all(
            selectedSelas.map(id => selasService.updateSELAS(id, { active: true }))
          );
          break;
        case 'deactivate':
          await Promise.all(
            selectedSelas.map(id => selasService.updateSELAS(id, { active: false }))
          );
          break;
        case 'delete':
          await Promise.all(
            selectedSelas.map(id => selasService.deleteSELAS(id))
          );
          break;
      }
      
      await fetchSELAS();
      setSelectedSelas([]);
      setAdminAction('default');
    } catch (err) {
      setError(`Erreur lors de l'action de masse`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportSELAS = async () => {
    try {
      const exportData = await selasService.exportSELAS(selectedSelas);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'selas_export.json';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erreur lors de l\'exportation des SELAS');
    }
  };

  const renderAdminSection = () => {
    if (!editMode) return null;

    return (
      <div className="admin-section">
        <h3>Actions d'administration</h3>
        {adminAction === 'default' && (
          <div className="action-buttons">
            <button 
              className="btn btn-secondary"
              onClick={() => setAdminAction('bulk')}
              disabled={selectedSelas.length === 0}
            >
              Actions de masse
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setAdminAction('export')}
              disabled={selectedSelas.length === 0}
            >
              Exporter
            </button>
          </div>
        )}

        {adminAction === 'bulk' && (
          <div>
            <select 
              value={bulkActionType}
              onChange={(e) => setBulkActionType(e.target.value as any)}
              title="Sélectionner une action de masse"
            >
              <option value="activate">Activer</option>
              <option value="deactivate">Désactiver</option>
              <option value="delete">Supprimer</option>
            </select>
            <button 
              className="btn btn-primary"
              onClick={handleBulkAction}
            >
              Appliquer
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setAdminAction('default')}
            >
              Annuler
            </button>
          </div>
        )}

        {adminAction === 'export' && (
          <div>
            <button 
              className="btn btn-primary"
              onClick={handleExportSELAS}
            >
              Confirmer l'exportation
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setAdminAction('default')}
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    );
  };

  // Nouvelle fonction pour définir la SELAS par défaut
  const handleSetDefaultSELAS = async (selasId: string) => {
    try {
      // Récupérer l'ID de l'utilisateur connecté
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser || !currentUser.uid) {
        alert('Vous devez être connecté pour effectuer cette action');
        return;
      }
      
      // Trouver l'utilisateur dans Firestore et mettre à jour son SELAS par défaut
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('uid', '==', currentUser.uid));
      const querySnapshot = await getDocs(userQuery);
      
      if (querySnapshot.empty) {
        alert('Votre profil utilisateur n\'a pas été trouvé');
        return;
      }
      
      const userDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        defaultSelasId: selasId,
        lastUpdated: new Date().toISOString()
      });
      
      // Afficher un message de succès
      alert(`SELAS définie comme SELAS par défaut avec succès`);
      
      // Mettre à jour localStorage pour une expérience utilisateur immédiate
      localStorage.setItem('currentSelasId', selasId);
    } catch (error) {
      // Gérer les erreurs
      console.error('Erreur lors de la définition de la SELAS par défaut:', error);
      setError('Impossible de définir la SELAS par défaut');
      alert('Impossible de définir la SELAS par défaut');
    }
  };

  // Mappings pour les noms d'accès
  const accessPageNames: Record<string, string> = {
    dashboard: 'Tableau de bord',
    passages: 'Passages',
    sites: 'Sites',
    tournees: 'Tournées',
    vehicules: 'Véhicules',
    map: 'Carte',
    userManagement: 'Gestion utilisateurs',
    adminPanel: 'Administration'
  };
  
  // Améliorer la définition des colonnes
  const columns = [
    {
      title: 'Sélection',
      dataIndex: 'id',
      width: 50,
      render: (id: string) => (
        <Checkbox 
          checked={selectedSelas.includes(id)}
          onChange={() => toggleSelectSelas(id)}
          aria-label={`Sélectionner SELAS ${id}`}
        />
      )
    },
    {
      title: 'Nom',
      dataIndex: 'nom',
      width: 150,
      render: (nom: string, record: SELAS) => (
        <Input 
          value={nom}
          onChange={(e) => handleEdit(record.id, 'nom', e.target.value)}
          aria-label="Nom de la SELAS"
        />
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      width: 200,
      render: (description: string, record: SELAS) => (
        <Input 
          value={description}
          onChange={(e) => handleEdit(record.id, 'description', e.target.value)}
          aria-label="Description de la SELAS"
        />
      )
    },
    {
      title: 'Code',
      dataIndex: 'code',
      width: 100,
      render: (code: string, record: SELAS) => (
        <Input 
          value={code}
          onChange={(e) => handleEdit(record.id, 'code', e.target.value)}
          aria-label="Code de la SELAS"
        />
      )
    },
    {
      title: 'Statut',
      dataIndex: 'active',
      width: 100,
      render: (active: boolean, record: SELAS) => (
        <Switch 
          checked={active}
          onChange={(checked) => handleEdit(record.id, 'active', checked)}
          aria-label="Statut de la SELAS"
        />
      )
    },
    {
      title: 'Accès',
      dataIndex: 'accesPages',
      width: 300,
      render: (accesPages: Record<string, boolean> = {}, record: SELAS) => (
        <div className="acces-pages-container">
          {editMode ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(accesPages).map(([page, hasAccess]) => (
                <Checkbox 
                  key={page}
                  checked={!!hasAccess}
                  onChange={(e) => handleEdit(
                    record.id, 
                    `accesPages.${page}`, 
                    e.target.checked
                  )}
                  style={{ marginRight: '8px', marginBottom: '8px' }}
                >
                  <span style={{ fontSize: '0.8rem' }}>{accessPageNames[page] || page}</span>
                </Checkbox>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {Object.entries(accesPages).filter(([_, hasAccess]) => hasAccess).map(([page]) => (
                <Tag color="blue" key={page} style={{ margin: '2px' }}>
                  {accessPageNames[page] || page}
                </Tag>
              ))}
              {!Object.values(accesPages || {}).some(Boolean) && (
                <span style={{ color: '#999', fontStyle: 'italic' }}>Aucun accès</span>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Utilisateurs',
      dataIndex: 'utilisateurs',
      width: 200,
      render: (utilisateurs: string[] = [], record: SELAS) => (
        <div className="users-association">
          {editMode ? (
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Associer des utilisateurs"
              value={utilisateurs || []}
              onChange={(newUsers) => handleUserAssociation(record.id, newUsers)}
              optionFilterProp="children"
              filterOption={(input, option) => 
                (option?.label?.toString().toLowerCase() || '').includes(input.toLowerCase())
              }
              options={availableUsers.map(user => ({
                value: user.id,
                label: user.nom ? `${user.nom} (${user.email})` : user.email
              }))}
            />
          ) : (
            <div>
              {utilisateurs && utilisateurs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {utilisateurs.slice(0, 3).map(userId => {
                    const user = availableUsers.find(u => u.id === userId);
                    return (
                      <div
                        key={userId}
                        style={{
                          backgroundColor: '#52c41a',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          margin: '2px 0',
                          fontSize: '12px'
                        }}
                      >
                        <FaUser style={{ marginRight: '5px' }} />
                        {user ? user.nom || user.email : 'Utilisateur inconnu'}
                      </div>
                    );
                  })}
                  {utilisateurs.length > 3 && (
                    <Tooltip title={utilisateurs.slice(3).map(userId => {
                      const user = availableUsers.find(u => u.id === userId);
                      return user ? user.nom || user.email : 'Utilisateur inconnu';
                    }).join(', ')}>
                      <div style={{
                        backgroundColor: '#1890ff',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        margin: '2px 0',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}>
                        {`+${utilisateurs.length - 3} autres`}
                      </div>
                    </Tooltip>
                  )}
                </div>
              ) : (
                <span style={{ color: '#999', fontStyle: 'italic' }}>Aucun utilisateur</span>
              )}
            </div>
          )}
        </div>
      )
    }
  ];

  // Améliorer la fonction handleUserAssociation
  const handleUserAssociation = async (selasId: string, userIds: string[]) => {
    try {
      console.log(`Association des utilisateurs à la SELAS ${selasId}:`, userIds);
      
      // Si c'est la nouvelle SELAS temporaire, mettre à jour l'état newSelas
      if (selasId === 'new-selas-temp') {
        setNewSelas(prev => ({
          ...prev!,
          utilisateurs: userIds
        }));
        return;
      }
      
      // Sinon, mettre à jour une SELAS existante
      setSelas(prev => 
        prev.map(sela => 
          sela.id === selasId 
            ? { ...sela, utilisateurs: userIds }
            : sela
        )
      );
      
      // Si vous avez une API pour l'association, vous pouvez l'appeler ici
      // await userService.associateUsersToSELAS(selasId, userIds);
    } catch (error) {
      console.error('Erreur lors de l\'association des utilisateurs:', error);
      setError('Erreur lors de l\'association des utilisateurs');
    }
  };

  if (loading) {
    return <div className="loading">Chargement des SELAS...</div>;
  }

  return (
    <div className="selas-management">
      <div className="selas-management-header">
        <h2>Gestion des SELAS</h2>
        <div className="action-buttons">
          {!editMode ? (
            <>
              <button 
                className="btn btn-primary"
                onClick={() => setEditMode(true)}
                style={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 500,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}
              >
                <FaEdit /> Modifier
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setEditMode(true);
                  setNewSelas({
                    nom: '',
                    description: '',
                    code: '',
                    active: true,
                    accesPages: {
                      dashboard: true,
                      passages: false,
                      sites: false,
                      tournees: false,
                      vehicules: false,
                      map: false,
                      userManagement: false,
                      adminPanel: false
                    },
                    sitesAutorises: []
                  });
                }}
                style={{
                  backgroundColor: '#2196f3',
                  color: 'white',
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 500,
                  marginLeft: '10px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}
              >
                <FaPlus /> Ajouter
              </button>
            </>
          ) : (
            <>
              <button 
                className="btn btn-primary"
                onClick={handleSaveChanges}
                style={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 500,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}
              >
                <FaSave /> Enregistrer
              </button>
              <button 
                className="btn btn-secondary"
                onClick={handleCancelEdit}
                style={{
                  backgroundColor: '#ff9800',
                  color: 'white',
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 500,
                  marginLeft: '10px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}
              >
                <FaTimes /> Annuler
              </button>
              {selectedSelas.length > 0 && (
                <button 
                  className="btn btn-danger"
                  onClick={handleDeleteSelected}
                  style={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    padding: '10px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 500,
                    marginLeft: '10px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}
                >
                  <FaTrash /> Supprimer ({selectedSelas.length})
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      {renderAdminSection()}
      
      <div className="controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Rechercher une SELAS..."
            value={quickSearch}
            onChange={e => setQuickSearch(e.target.value)}
            className="search-input"
          />
          {quickSearch && (
            <button 
              className="clear-search" 
              onClick={() => setQuickSearch('')}
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="action-buttons">
          {!editMode ? (
            <>
              {/* Actions pour le mode consultation - pas de boutons ici, ils sont déjà en haut */}
            </>
          ) : (
            <>
              {selectedSelas.length > 0 && (
                <button 
                  className="modern-button delete-button" 
                  onClick={handleDeleteSelected}
                  style={{ 
                    backgroundColor: '#f44336', 
                    color: 'white',
                    padding: '8px 15px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}
                >
                  <FaTrash /> Supprimer ({selectedSelas.length})
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="selas-table-container">
        <div className="results-info">
          <p>{filteredSelas.length} résultat(s) trouvé(s){quickSearch ? ` pour la recherche "${quickSearch}"` : ''}</p>
        </div>
        
        <Table 
          columns={columns}
          dataSource={selasToRender}
          loading={loading}
          scroll={{ x: 1500 }}
          rowSelection={{
            selectedRowKeys: selectedSelas,
            onChange: (keys) => {
              const stringKeys = keys.map(key => key.toString());
              setSelectedSelas(stringKeys);
            },
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
          }}
          rowKey="id"
          rowClassName={(record) => {
            return record.id === 'new-selas-temp' ? 'new-selas-row' : '';
          }}
        />
      </div>
      
      {editMode && (
        <div className="default-selas-actions">
          {selectedSelas.length === 1 && (
            <button 
              className="set-default-button"
              onClick={() => handleSetDefaultSELAS(selectedSelas[0])}
              style={{
                backgroundColor: '#2196f3',
                color: 'white',
                padding: '10px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 500,
                marginTop: '15px',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}
            >
              <FaCheckCircle /> Définir comme SELAS par défaut
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SELASManagement; 

