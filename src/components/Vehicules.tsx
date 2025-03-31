import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import fr from 'date-fns/locale/fr';
import 'react-datepicker/dist/react-datepicker.css';
import './EditMode.css';
import './Vehicules.css';
import { usePoles } from '../services/PoleService';
import PoleSelector from './PoleSelector';
import PoleFilter from './PoleFilter';

// Enregistrer la locale française
registerLocale('fr', fr);

interface Vehicule {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  type: string;
  annee: number;
  statut: 'actif' | 'maintenance' | 'inactif';
  dernierEntretien?: string;
  coursierAssigne?: string;
  kilometrage: number;
  pole?: string;
}

const Vehicules: React.FC = () => {
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // État pour le modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentVehicule, setCurrentVehicule] = useState<Partial<Vehicule>>({
    immatriculation: '',
    marque: '',
    modele: '',
    type: 'Voiture',
    annee: new Date().getFullYear(),
    statut: 'actif',
    coursierAssigne: '',
    kilometrage: 0
  });

  // État pour le mode édition et la sélection multiple
  const [editMode, setEditMode] = useState(false);
  const [selectedVehicules, setSelectedVehicules] = useState<string[]>([]);
  const [editingVehicules, setEditingVehicules] = useState<{[key: string]: Vehicule}>({});
  const [selectAll, setSelectAll] = useState(false);
  
  // Ajouter un nouvel état pour les nouveaux véhicules temporaires
  const [newVehicules, setNewVehicules] = useState<Partial<Vehicule>[]>([]);
  
  // État pour la recherche rapide
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [filteredVehicules, setFilteredVehicules] = useState<Vehicule[]>([]);

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

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [modifyMenuOpen, setModifyMenuOpen] = useState(false);

  useEffect(() => {
    fetchVehicules();
  }, []);

  // Effet pour gérer la sélection/désélection de tous les véhicules
  useEffect(() => {
    if (selectAll) {
      setSelectedVehicules(vehicules.map(vehicule => vehicule.id));
    } else if (selectedVehicules.length === vehicules.length) {
      // Si tous les véhicules sont sélectionnés mais que selectAll est false, cela signifie que l'utilisateur a désélectionné
      setSelectedVehicules([]);
    }
  }, [selectAll]);

  // Initialiser les véhicules filtrés au chargement
  useEffect(() => {
    setFilteredVehicules(vehicules);
  }, [vehicules]);

  // Effet pour filtrer les véhicules en fonction de la recherche rapide et du pôle sélectionné
  useEffect(() => {
    let results = vehicules;

    // Filtrer par pôle si un pôle est sélectionné
    if (selectedPole) {
      results = results.filter(vehicule => vehicule.pole === selectedPole);
    }

    // Ensuite filtrer par recherche rapide
    if (quickSearch.trim()) {
      const searchTerm = quickSearch.toLowerCase().trim();
      results = results.filter(vehicule => {
        // Rechercher dans tous les champs textuels du véhicule
        return (
          vehicule.immatriculation.toLowerCase().includes(searchTerm) ||
          vehicule.marque.toLowerCase().includes(searchTerm) ||
          vehicule.modele.toLowerCase().includes(searchTerm) ||
          vehicule.type.toLowerCase().includes(searchTerm) ||
          vehicule.statut.toLowerCase().includes(searchTerm) ||
          (vehicule.coursierAssigne || '').toLowerCase().includes(searchTerm) ||
          vehicule.annee.toString().includes(searchTerm) ||
          vehicule.kilometrage.toString().includes(searchTerm)
        );
      });
    }

    setFilteredVehicules(results);
  }, [quickSearch, vehicules, selectedPole]);

  const fetchVehicules = async () => {
    try {
      setLoading(true);
      
      // Utiliser des données mockées temporairement pour débloquer l'interface
      const mockVehicules = [
        {
          id: '1',
          immatriculation: 'GE-695-RT',
          marque: 'Renault',
          modele: 'Kangoo',
          type: 'Utilitaire',
          annee: 2020,
          statut: 'actif' as const,
          dernierEntretien: '2023-01-15',
          coursierAssigne: 'Sébastien Lherlier',
          kilometrage: 45000
        },
        {
          id: '2',
          immatriculation: 'GI-456-AD',
          marque: 'Citroën',
          modele: 'Berlingo',
          type: 'Utilitaire',
          annee: 2021,
          statut: 'actif' as const,
          dernierEntretien: '2023-02-10',
          coursierAssigne: 'Guillaume Sage',
          kilometrage: 32500
        },
        {
          id: '3',
          immatriculation: 'GL-789-BA',
          marque: 'Renault',
          modele: 'Clio',
          type: 'Voiture',
          annee: 2022,
          statut: 'actif' as const,
          dernierEntretien: '2023-02-20',
          coursierAssigne: 'Michel Roude',
          kilometrage: 15800
        }
      ];
      
      // Essayer de récupérer les données de Firebase, mais utiliser les données mockées en cas d'erreur
      try {
        const vehiculesRef = collection(db, 'vehicules');
        const snapshot = await getDocs(vehiculesRef);
        
        if (!snapshot.empty) {
          const vehiculesData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              immatriculation: data.immatriculation || '',
              marque: data.marque || '',
              modele: data.modele || '',
              type: data.type || 'Voiture',
              annee: data.annee || new Date().getFullYear(),
              statut: data.statut || 'actif',
              dernierEntretien: data.dernierEntretien || '',
              coursierAssigne: data.coursierAssigne || '',
              kilometrage: data.kilometrage || 0,
              pole: data.pole || ''
            } as Vehicule;
          });
          
          console.log("Véhicules récupérés depuis Firestore:", vehiculesData);
          setVehicules(vehiculesData);
        } else {
          // Si la collection est vide, utiliser les données mockées et les ajouter à Firebase
          setVehicules(mockVehicules);
          
          // Ajouter les données mockées à Firebase
          for (const vehicule of mockVehicules) {
            const { id, ...vehiculeData } = vehicule;
            await addDoc(collection(db, 'vehicules'), vehiculeData);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des véhicules:', error);
        // En cas d'erreur, utiliser les données mockées
        setVehicules(mockVehicules);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des véhicules:', error);
      setError('Erreur lors de la récupération des données');
      setVehicules([]);
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const parsedValue = name === 'annee' || name === 'kilometrage' ? parseInt(value) : value;
    setCurrentVehicule(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && currentVehicule.id) {
        // Mettre à jour un véhicule existant dans Firestore
        await updateDoc(doc(db, 'vehicules', currentVehicule.id), {
          immatriculation: currentVehicule.immatriculation,
          marque: currentVehicule.marque,
          modele: currentVehicule.modele,
          type: currentVehicule.type,
          annee: currentVehicule.annee,
          statut: currentVehicule.statut,
          dernierEntretien: currentVehicule.dernierEntretien,
          coursierAssigne: currentVehicule.coursierAssigne,
          kilometrage: currentVehicule.kilometrage
        });
        
        // Mettre à jour l'état local
        setVehicules(vehicules.map(vehicule => 
          vehicule.id === currentVehicule.id ? { ...vehicule, ...currentVehicule as Vehicule } : vehicule
        ));
      } else {
        // Ajouter un nouveau véhicule dans Firestore
        const docRef = await addDoc(collection(db, 'vehicules'), {
          immatriculation: currentVehicule.immatriculation,
          marque: currentVehicule.marque,
          modele: currentVehicule.modele,
          type: currentVehicule.type,
          annee: currentVehicule.annee,
          statut: currentVehicule.statut,
          dernierEntretien: currentVehicule.dernierEntretien,
          coursierAssigne: currentVehicule.coursierAssigne,
          kilometrage: currentVehicule.kilometrage
        });
        
        // Mettre à jour l'état local avec le nouvel ID
        const newVehicule = {
          ...currentVehicule as Vehicule,
          id: docRef.id
        };
        
        setVehicules([...vehicules, newVehicule]);
      }
      
      // Fermer le modal et réinitialiser le formulaire
      closeModal();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      setError('Erreur lors de l\'enregistrement');
    }
  };

  const handleEdit = (vehicule: Vehicule) => {
    setCurrentVehicule(vehicule);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDeleteSelected = async () => {
    if (selectedVehicules.length === 0) {
      alert('Veuillez sélectionner au moins un véhicule à supprimer');
      return;
    }

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedVehicules.length} véhicule(s) ?`)) {
      try {
        // Supprimer les véhicules sélectionnés de Firestore
        const deletePromises = selectedVehicules.map(id => deleteDoc(doc(db, 'vehicules', id)));
        await Promise.all(deletePromises);
        
        // Mettre à jour l'état local
        setVehicules(vehicules.filter(vehicule => !selectedVehicules.includes(vehicule.id)));
        setSelectedVehicules([]);
        setSelectAll(false);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        setError('Erreur lors de la suppression');
      }
    }
  };

  // Fonction pour gérer la sélection/désélection de tous les véhicules
  const handleSelectAllChange = () => {
    setSelectAll(!selectAll);
  };

  const toggleEditMode = () => {
    if (editMode) {
      // Si on quitte le mode édition, réinitialiser les sélections et les modifications
      setSelectedVehicules([]);
      setEditingVehicules({});
      setSelectAll(false);
      setNewVehicules([]);
      
      // Rafraîchir les données depuis Firebase
      fetchVehicules();
    } else {
      // Si on entre en mode édition, initialiser les sites en édition
      const editingVehiculesObj: {[key: string]: Vehicule} = {};
      filteredVehicules.forEach(vehicule => {
        editingVehiculesObj[vehicule.id] = { ...vehicule };
      });
      setEditingVehicules(editingVehiculesObj);
    }
    
    // Inverser le mode édition
    setEditMode(!editMode);
    
    // Réinitialiser la recherche rapide et les filtres
    setQuickSearch('');
    setSelectedPole('');
  };

  const saveAllChanges = async () => {
    try {
      console.log("Début de la sauvegarde des modifications...");
      console.log("Véhicules à mettre à jour:", Object.keys(editingVehicules).length);
      console.log("Nouveaux véhicules à ajouter:", newVehicules.length);
      
      // Sauvegarder les modifications des véhicules existants
      const updatePromises = Object.entries(editingVehicules).map(async ([id, vehicule]) => {
        try {
          console.log(`Mise à jour du véhicule ${id}:`, vehicule);
          
          // Vérifier si le document existe avant de tenter une mise à jour
          const vehiculeRef = doc(db, 'vehicules', id);
          
          // Créer un objet avec uniquement les champs définis
          const updateData: Partial<Vehicule> = {};
          
          // Vérifier et ajouter chaque champ s'il est défini
          if (vehicule.immatriculation !== undefined) updateData.immatriculation = vehicule.immatriculation;
          if (vehicule.marque !== undefined) updateData.marque = vehicule.marque;
          if (vehicule.modele !== undefined) updateData.modele = vehicule.modele;
          if (vehicule.type !== undefined) updateData.type = vehicule.type;
          if (vehicule.annee !== undefined) updateData.annee = vehicule.annee;
          if (vehicule.statut !== undefined) updateData.statut = vehicule.statut;
          if (vehicule.dernierEntretien !== undefined) updateData.dernierEntretien = vehicule.dernierEntretien;
          if (vehicule.coursierAssigne !== undefined) updateData.coursierAssigne = vehicule.coursierAssigne;
          if (vehicule.kilometrage !== undefined) updateData.kilometrage = vehicule.kilometrage;
          if (vehicule.pole !== undefined) updateData.pole = vehicule.pole;
          
          // Exclure l'ID du document des données à mettre à jour
          const { id: vehiculeId, ...vehiculeData } = vehicule;
          
          await updateDoc(vehiculeRef, updateData);
          console.log(`Véhicule ${id} mis à jour avec succès`);
          return id;
        } catch (error) {
          console.error(`Erreur lors de la mise à jour du véhicule ${id}:`, error);
          throw error;
        }
      });
      
      // Ajouter les nouveaux véhicules
      const addPromises = newVehicules.map(async (vehicule, index) => {
        try {
          console.log(`Ajout du nouveau véhicule à l'index ${index}:`, vehicule);
          
          // S'assurer que tous les champs requis sont présents
          const vehiculeToAdd: Partial<Vehicule> = {
            immatriculation: vehicule.immatriculation || '',
            marque: vehicule.marque || '',
            modele: vehicule.modele || '',
            type: vehicule.type || 'Voiture',
            annee: vehicule.annee || new Date().getFullYear(),
            statut: vehicule.statut || 'actif',
            coursierAssigne: vehicule.coursierAssigne || '',
            kilometrage: vehicule.kilometrage || 0,
            dernierEntretien: vehicule.dernierEntretien || '',
            pole: vehicule.pole || ''
          };
          
          const docRef = await addDoc(collection(db, 'vehicules'), vehiculeToAdd);
          console.log(`Nouveau véhicule ajouté avec l'ID: ${docRef.id}`);
          return docRef.id;
        } catch (error) {
          console.error(`Erreur lors de l'ajout du nouveau véhicule à l'index ${index}:`, error);
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
      
      // Rafraîchir les données
      await fetchVehicules();
      
      // Réinitialiser les états
      setEditingVehicules({});
      setNewVehicules([]);
      
      if (rejected > 0) {
        alert(`Modifications partiellement enregistrées. ${rejected} opérations ont échoué.`);
      } else {
        alert('Modifications enregistrées avec succès');
      }
      
      // Désactiver le mode édition après sauvegarde réussie
      setEditMode(false);
      setSelectedVehicules([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setError('Erreur lors de la sauvegarde');
      alert('Erreur lors de la sauvegarde des modifications. Veuillez réessayer.');
    }
  };

  const handleCellChange = (id: string, field: keyof Vehicule, value: any) => {
    console.log(`Mise à jour du véhicule ${id}, champ ${field} avec la valeur:`, value);
    setEditingVehicules({
      ...editingVehicules,
      [id]: {
        ...editingVehicules[id],
        [field]: value
      }
    });
  };

  const handleSelectVehicule = (id: string) => {
    if (selectedVehicules.includes(id)) {
      setSelectedVehicules(selectedVehicules.filter(vehiculeId => vehiculeId !== id));
    } else {
      setSelectedVehicules([...selectedVehicules, id]);
    }
  };

  const handleDateChange = (date: Date | null, id: string) => {
    if (date) {
      setEditingVehicules({
        ...editingVehicules,
        [id]: {
          ...editingVehicules[id],
          dernierEntretien: date.toISOString().split('T')[0]
        }
      });
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, id: string) => {
    const { name, value } = e.target;
    
    // Extraire le nom du champ à partir de l'attribut name ou utiliser un nom par défaut basé sur le type d'entrée
    let fieldName = name;
    
    // Si le nom est vide ou non défini, essayer de l'extraire du nom complet
    if (!fieldName || fieldName.startsWith('vehicule-')) {
      const nameParts = fieldName.split('-');
      if (nameParts.length >= 3) {
        fieldName = nameParts[2]; // Prendre la troisième partie (après "vehicule-id-")
      } else {
        // Fallback: utiliser un nom basé sur le type d'entrée
        if (e.target.type === 'date') {
          fieldName = 'dernierEntretien';
        } else if (e.target.tagName.toLowerCase() === 'select') {
          // Déterminer le type de select
          if (value === 'actif' || value === 'maintenance' || value === 'inactif') {
            fieldName = 'statut';
          } else if (value === 'Voiture' || value === 'Utilitaire' || value === 'Camionnette') {
            fieldName = 'type';
          }
        }
      }
    }
    
    console.log(`Modification du champ ${fieldName} pour le véhicule ${id} avec la valeur ${value}`);
    
    // Convertir les valeurs numériques si nécessaire
    const parsedValue = fieldName === 'annee' || fieldName === 'kilometrage' ? parseInt(value) : value;
    
    // S'assurer que le véhicule existe dans l'état d'édition
    if (!editingVehicules[id]) {
      // Si le véhicule n'existe pas dans l'état d'édition, le récupérer depuis l'état des véhicules
      const vehicule = vehicules.find(v => v.id === id);
      if (vehicule) {
        setEditingVehicules(prev => ({
          ...prev,
          [id]: { ...vehicule, [fieldName]: parsedValue }
        }));
      }
    } else {
      // Mettre à jour le véhicule existant
      setEditingVehicules(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          [fieldName]: parsedValue
        }
      }));
    }
  };

  const addNewVehicule = () => {
    // Forcer le mode édition si ce n'est pas déjà le cas
    if (!editMode) {
      setEditMode(true);
    }

    const newVehicule: Partial<Vehicule> = {
      id: `temp-${Date.now()}`, // Identifiant temporaire unique
      immatriculation: '',
      marque: '',
      modele: '',
      type: 'Voiture',
      annee: new Date().getFullYear(),
      statut: 'actif',
      coursierAssigne: '',
      kilometrage: 0
    };
    
    // Ajouter la nouvelle ligne au début du tableau
    setNewVehicules(prevNewVehicules => [newVehicule, ...prevNewVehicules]);
    
    // Ajouter un délai pour permettre le rendu
    setTimeout(() => {
      const firstInput = document.querySelector('.vehicules-table-container .new-vehicule-row input') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  };

  const handleNewVehiculeChange = (index: number, field: keyof Vehicule, value: any) => {
    const updatedNewVehicules = [...newVehicules];
    
    // S'assurer que le véhicule existe à cet index
    if (!updatedNewVehicules[index]) {
      updatedNewVehicules[index] = {
        id: `temp-${Date.now()}-${index}`,
        immatriculation: '',
        marque: '',
        modele: '',
        type: 'Voiture',
        annee: new Date().getFullYear(),
        statut: 'actif',
        coursierAssigne: '',
        kilometrage: 0
      };
    }
    
    updatedNewVehicules[index] = {
      ...updatedNewVehicules[index],
      [field]: value
    };
    
    setNewVehicules(updatedNewVehicules);
  };

  const removeNewVehicule = (index: number) => {
    setNewVehicules(newVehicules.filter((_, i) => i !== index));
  };

  const openModal = () => {
    setCurrentVehicule({
      immatriculation: '',
      marque: '',
      modele: '',
      type: 'Voiture',
      annee: new Date().getFullYear(),
      statut: 'actif',
      coursierAssigne: '',
      kilometrage: 0
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentVehicule({
      immatriculation: '',
      marque: '',
      modele: '',
      type: 'Voiture',
      annee: new Date().getFullYear(),
      statut: 'actif',
      coursierAssigne: '',
      kilometrage: 0
    });
    setIsEditing(false);
  };

  const getStatusClass = (statut: string) => {
    switch (statut) {
      case 'actif':
        return 'livré';
      case 'maintenance':
        return 'en-cours';
      case 'inactif':
        return 'en-cours';
      default:
        return '';
    }
  };

  // Fonction pour gérer le changement de pôle
  const handlePoleChange = (pole: string) => {
    setSelectedPole(pole);
  };

  const handleToggleModifyMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModifyMenuOpen(!modifyMenuOpen);
  };

  const handleClickOutside = () => {
    setModifyMenuOpen(false);
  };

  useEffect(() => {
    if (modifyMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [modifyMenuOpen]);

  // Fonction pour ouvrir le dialogue de colonnes
  const handleOpenColumnDialog = () => {
    alert('Fonctionnalité de gestion des colonnes pas encore implémentée');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des véhicules...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Véhicules</h2>
      </div>
      
      {/* En-tête fixe avec les boutons d'action */}
      <div className="sticky-header-top">
        <div className="action-buttons-group">
          {!editMode ? (
            <>
              <button className="button button-primary" onClick={toggleEditMode}>
                <i className="fas fa-edit"></i> Modifier
              </button>
            </>
          ) : (
            <>
              <button className="button button-success" onClick={saveAllChanges} disabled={loading}>
                <i className="fas fa-save"></i> Enregistrer
              </button>
              <button 
                className="button button-warning" 
                onClick={() => {
                  if (window.confirm("Êtes-vous sûr de vouloir annuler toutes les modifications ?")) {
                    setEditingVehicules({});
                    setNewVehicules([]);
                    setSelectedVehicules([]);
                    setEditMode(false);
                  }
                }}
                disabled={loading}
              >
                <i className="fas fa-times"></i> Annuler
              </button>
              <button className="button button-info" onClick={addNewVehicule} disabled={loading}>
                <i className="fas fa-plus"></i> Ajouter
              </button>
              <button className="button button-danger" onClick={handleDeleteSelected} disabled={selectedVehicules.length === 0 || loading}>
                <i className="fas fa-trash-alt"></i> Supprimer ({selectedVehicules.length})
              </button>
              <button className="button button-info" onClick={handleOpenColumnDialog}>
                <i className="fas fa-columns"></i> Colonnes
              </button>
            </>
          )}
        </div>
        <div className="quick-search-container">
          <input
            type="text"
            className="quick-search-input"
            placeholder="Recherche rapide..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            disabled={loading}
          />
          <select
            className="pole-filter"
            value={selectedPole}
            onChange={(e) => handlePoleChange(e.target.value)}
            disabled={loading}
          >
            <option value="">Filtrer par pôle</option>
            <option value="CENTRE">CENTRE</option>
            <option value="EST">EST</option>
            <option value="OUEST">OUEST</option>
          </select>
        </div>
      </div>
      
      <div className="vehicules-table-container" style={{ overflowX: 'auto' }}>
        <div className="results-info">
          <p>{filteredVehicules.length} résultat(s) trouvé(s){quickSearch ? ` pour la recherche "${quickSearch}"` : ''}</p>
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
                    aria-label="Sélectionner tous les véhicules"
                  />
                </th>
              )}
              <th>PÔLE</th>
              <th>Immatriculation</th>
              <th>Marque</th>
              <th>Modèle</th>
              <th>Type</th>
              <th>Année</th>
              <th>Statut</th>
              <th>Dernier Entretien</th>
              <th>Coursier Assigné</th>
              <th>Kilométrage</th>
            </tr>
          </thead>
          <tbody>
            {/* Nouvelles lignes temporaires */}
            {editMode && newVehicules.map((newVehicule, index) => (
              <tr key={newVehicule.id} className="new-vehicule-row">
                <td style={{display: 'none'}}>
                  {/* Cellule masquée pour maintenir l'alignement */}
                </td>
                <td>
                  <PoleSelector
                    value={newVehicule.pole || ''}
                    onChange={(value) => handleNewVehiculeChange(index, 'pole', value)}
                    placeholder="Sélectionner un pôle"
                    style={{ width: '100%' }}
                    showSearch
                    allowClear
                    title="Pôle du véhicule"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={newVehicule.immatriculation || ''}
                    onChange={(e) => handleNewVehiculeChange(index, 'immatriculation', e.target.value)}
                    className="inline-edit-input"
                    placeholder="Immatriculation"
                    aria-label="Immatriculation du nouveau véhicule"
                    name={`new-vehicule-${index}-immatriculation`}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={newVehicule.marque || ''}
                    onChange={(e) => handleNewVehiculeChange(index, 'marque', e.target.value)}
                    className="inline-edit-input"
                    placeholder="Marque"
                    aria-label="Marque du nouveau véhicule"
                    name={`new-vehicule-${index}-marque`}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={newVehicule.modele || ''}
                    onChange={(e) => handleNewVehiculeChange(index, 'modele', e.target.value)}
                    className="inline-edit-input"
                    placeholder="Modèle"
                    aria-label="Modèle du nouveau véhicule"
                    name={`new-vehicule-${index}-modele`}
                  />
                </td>
                <td>
                  <select
                    value={newVehicule.type || 'Voiture'}
                    onChange={(e) => handleNewVehiculeChange(index, 'type', e.target.value)}
                    className="inline-edit-select"
                    aria-label="Type du nouveau véhicule"
                    name={`new-vehicule-${index}-type`}
                  >
                    <option value="Voiture">Voiture</option>
                    <option value="Utilitaire">Utilitaire</option>
                    <option value="Camionnette">Camionnette</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    value={newVehicule.annee || new Date().getFullYear()}
                    onChange={(e) => handleNewVehiculeChange(index, 'annee', e.target.value)}
                    className="inline-edit-input"
                    placeholder="Année"
                    aria-label="Année du nouveau véhicule"
                    name={`new-vehicule-${index}-annee`}
                  />
                </td>
                <td>
                  <select
                    value={newVehicule.statut || 'actif'}
                    onChange={(e) => handleNewVehiculeChange(index, 'statut', e.target.value)}
                    className="inline-edit-select"
                    aria-label="Statut du nouveau véhicule"
                    name={`new-vehicule-${index}-statut`}
                  >
                    <option value="actif">Actif</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </td>
                <td>
                  <input
                    type="date"
                    value={newVehicule.dernierEntretien || ''}
                    onChange={(e) => handleNewVehiculeChange(index, 'dernierEntretien', e.target.value)}
                    className="inline-edit-input"
                    aria-label="Date du dernier entretien du nouveau véhicule"
                    name={`new-vehicule-${index}-dernierEntretien`}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={newVehicule.coursierAssigne || ''}
                    onChange={(e) => handleNewVehiculeChange(index, 'coursierAssigne', e.target.value)}
                    className="inline-edit-input"
                    placeholder="Coursier"
                    aria-label="Coursier assigné au nouveau véhicule"
                    name={`new-vehicule-${index}-coursierAssigne`}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={newVehicule.kilometrage || 0}
                    onChange={(e) => handleNewVehiculeChange(index, 'kilometrage', e.target.value)}
                    className="inline-edit-input"
                    placeholder="Kilométrage"
                    aria-label="Kilométrage du nouveau véhicule"
                    name={`new-vehicule-${index}-kilometrage`}
                  />
                </td>
              </tr>
            ))}

            {filteredVehicules.map((vehicule) => (
              <tr key={vehicule.id} className={selectedVehicules.includes(vehicule.id) ? 'selected-row' : ''}>
                {editMode && (
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedVehicules.includes(vehicule.id)} 
                      onChange={() => handleSelectVehicule(vehicule.id)}
                      aria-label={`Sélectionner le véhicule ${vehicule.immatriculation}`}
                    />
                  </td>
                )}
                <td>
                  {editMode ? (
                    <PoleSelector
                      value={editingVehicules[vehicule.id]?.pole || vehicule.pole || ''}
                      onChange={(value) => handleCellChange(vehicule.id, 'pole', value)}
                      placeholder="Sélectionner un pôle"
                      style={{ width: '100%' }}
                      showSearch
                      allowClear
                      title="Pôle du véhicule"
                    />
                  ) : (
                    getPoleNameById(vehicule.pole)
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="text"
                      value={editingVehicules[vehicule.id]?.immatriculation || vehicule.immatriculation}
                      onChange={(e) => handleCellChange(vehicule.id, 'immatriculation', e.target.value)}
                      className="inline-edit-input"
                      placeholder="Immatriculation"
                    />
                  ) : (
                    vehicule.immatriculation || '-'
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="text"
                      value={editingVehicules[vehicule.id]?.marque || vehicule.marque}
                      onChange={(e) => handleCellChange(vehicule.id, 'marque', e.target.value)}
                      className="inline-edit-input"
                      placeholder="Marque"
                    />
                  ) : (
                    vehicule.marque || '-'
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="text"
                      value={editingVehicules[vehicule.id]?.modele || vehicule.modele}
                      onChange={(e) => handleCellChange(vehicule.id, 'modele', e.target.value)}
                      className="inline-edit-input"
                      placeholder="Modèle"
                    />
                  ) : (
                    vehicule.modele || '-'
                  )}
                </td>
                <td>
                  {editMode ? (
                    <select
                      value={editingVehicules[vehicule.id]?.type || vehicule.type}
                      onChange={(e) => handleCellChange(vehicule.id, 'type', e.target.value)}
                      className="inline-edit-select"
                      aria-label={`Modifier le type du véhicule ${vehicule.immatriculation}`}
                    >
                      <option value="Voiture">Voiture</option>
                      <option value="Utilitaire">Utilitaire</option>
                      <option value="Camionnette">Camionnette</option>
                    </select>
                  ) : (
                    vehicule.type || '-'
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="number"
                      value={editingVehicules[vehicule.id]?.annee || vehicule.annee}
                      onChange={(e) => handleEditInputChange(e, vehicule.id)}
                      className="inline-edit-input"
                      aria-label={`Modifier l'année du véhicule ${vehicule.immatriculation}`}
                      name={`vehicule-${vehicule.id}-annee`}
                    />
                  ) : (
                    vehicule.annee ? vehicule.annee.toString() : '-'
                  )}
                </td>
                <td>
                  {editMode ? (
                    <select
                      value={editingVehicules[vehicule.id]?.statut || vehicule.statut}
                      onChange={(e) => handleEditInputChange(e, vehicule.id)}
                      className="inline-edit-select"
                      aria-label={`Modifier le statut du véhicule ${vehicule.immatriculation}`}
                      name={`vehicule-${vehicule.id}-statut`}
                    >
                      <option value="actif">Actif</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="inactif">Inactif</option>
                    </select>
                  ) : (
                    vehicule.statut === 'actif' ? 'Actif' : 
                    vehicule.statut === 'maintenance' ? 'Maintenance' : 
                    'Inactif'
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="date"
                      value={editingVehicules[vehicule.id]?.dernierEntretien || vehicule.dernierEntretien || ''}
                      onChange={(e) => handleEditInputChange(e, vehicule.id)}
                      className="inline-edit-input"
                      aria-label={`Modifier la date du dernier entretien du véhicule ${vehicule.immatriculation}`}
                      name={`vehicule-${vehicule.id}-dernierEntretien`}
                    />
                  ) : (
                    vehicule.dernierEntretien || '-'
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="text"
                      value={editingVehicules[vehicule.id]?.coursierAssigne || vehicule.coursierAssigne || ''}
                      onChange={(e) => handleEditInputChange(e, vehicule.id)}
                      className="inline-edit-input"
                      aria-label={`Modifier le coursier assigné au véhicule ${vehicule.immatriculation}`}
                      name={`vehicule-${vehicule.id}-coursierAssigne`}
                    />
                  ) : (
                    vehicule.coursierAssigne || '-'
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="number"
                      value={editingVehicules[vehicule.id]?.kilometrage || vehicule.kilometrage}
                      onChange={(e) => handleEditInputChange(e, vehicule.id)}
                      className="inline-edit-input"
                      aria-label={`Modifier le kilométrage du véhicule ${vehicule.immatriculation}`}
                      name={`vehicule-${vehicule.id}-kilometrage`}
                    />
                  ) : (
                    vehicule.kilometrage ? vehicule.kilometrage.toString() : '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Modal pour ajouter/modifier un véhicule */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{isEditing ? 'Modifier le véhicule' : 'Ajouter un véhicule'}</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="immatriculation" className="form-label">Immatriculation</label>
                <input
                  type="text"
                  id="immatriculation"
                  name="immatriculation"
                  className="form-input"
                  value={currentVehicule.immatriculation}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="marque" className="form-label">Marque</label>
                <input
                  type="text"
                  id="marque"
                  name="marque"
                  className="form-input"
                  value={currentVehicule.marque}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="modele" className="form-label">Modèle</label>
                <input
                  type="text"
                  id="modele"
                  name="modele"
                  className="form-input"
                  value={currentVehicule.modele}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="type" className="form-label">Type</label>
                <select
                  id="type"
                  name="type"
                  className="form-select"
                  value={currentVehicule.type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Voiture">Voiture</option>
                  <option value="Utilitaire">Utilitaire</option>
                  <option value="Moto">Moto</option>
                  <option value="Vélo">Vélo</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="annee" className="form-label">Année</label>
                <input
                  type="number"
                  id="annee"
                  name="annee"
                  className="form-input"
                  value={currentVehicule.annee}
                  onChange={handleInputChange}
                  min="2000"
                  max={new Date().getFullYear()}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="kilometrage" className="form-label">Kilométrage</label>
                <input
                  type="number"
                  id="kilometrage"
                  name="kilometrage"
                  className="form-input"
                  value={currentVehicule.kilometrage}
                  onChange={handleInputChange}
                  min="0"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="dernierEntretien" className="form-label">Dernier Entretien</label>
                <div className="custom-datepicker-wrapper">
                  <DatePicker
                    selected={currentVehicule.dernierEntretien && currentVehicule.dernierEntretien !== '' 
                      ? new Date(currentVehicule.dernierEntretien) 
                      : null}
                    onChange={(date: Date | null) => {
                      if (date) {
                        const formattedDate = date.toISOString().split('T')[0];
                        setCurrentVehicule(prev => ({ ...prev, dernierEntretien: formattedDate }));
                      } else {
                        setCurrentVehicule(prev => ({ ...prev, dernierEntretien: undefined }));
                      }
                    }}
                    locale="fr"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="JJ/MM/AAAA"
                    className="form-input custom-datepicker-input"
                    popperPlacement="bottom-start"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    isClearable
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="coursierAssigne" className="form-label">Coursier Assigné</label>
                <input
                  type="text"
                  id="coursierAssigne"
                  name="coursierAssigne"
                  className="form-input"
                  value={currentVehicule.coursierAssigne || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="statut" className="form-label">Statut</label>
                <select
                  id="statut"
                  name="statut"
                  className="form-select"
                  value={currentVehicule.statut}
                  onChange={handleInputChange}
                  required
                >
                  <option value="actif">Actif</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={closeModal}>
                  Annuler
                </button>
                <button type="submit" className="button">
                  {isEditing ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehicules;
