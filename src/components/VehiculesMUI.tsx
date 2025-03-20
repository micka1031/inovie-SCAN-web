import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Button, Stack, Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, Tooltip, Container } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { GridColDef, GridRenderCellParams, GridValueFormatter } from '@mui/x-data-grid';
import DataTable from './DataTable';
import { usePoles } from '../services/PoleService';
import PoleFilter from './PoleFilter';
import PoleSelector from './PoleSelector';
import './Vehicules.css';

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

const VehiculesMUI: React.FC = () => {
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [filteredVehicules, setFilteredVehicules] = useState<Vehicule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicules, setSelectedVehicules] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedPole, setSelectedPole] = useState<string>('');
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [newVehiculeId, setNewVehiculeId] = useState<string | null>(null);
  
  // État pour le modal d'édition
  const [modalOpen, setModalOpen] = useState(false);
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
  
  const { poles } = usePoles();

  useEffect(() => {
    fetchVehicules();
  }, []);

  useEffect(() => {
    let results = vehicules;

    // Filtrer par pôle si un pôle est sélectionné
    if (selectedPole) {
      results = results.filter(vehicule => vehicule.pole === selectedPole);
    }

    setFilteredVehicules(results);
  }, [selectedPole, vehicules, quickSearch]);

  const fetchVehicules = async () => {
    try {
      setLoading(true);
      
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
          };
        });
        
        setVehicules(vehiculesData);
      } else {
        setVehicules([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des véhicules:', error);
      setError('Erreur lors de la récupération des données');
      setVehicules([]);
      setLoading(false);
    }
  };

  const getPoleNameById = (poleId: string | undefined): string => {
    if (!poleId) return '';
    const pole = poles.find(p => p.id === poleId);
    return pole ? pole.nom : poleId;
  };

  const handlePoleChange = (pole: string) => {
    setSelectedPole(pole);
  };

  const handleOpenModal = (vehicule?: Vehicule) => {
    if (vehicule) {
      setCurrentVehicule({ ...vehicule });
    } else {
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
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentVehicule({
      ...currentVehicule,
      [name]: name === 'annee' || name === 'kilometrage' ? parseInt(value) : value
    });
  };

  const handleSubmit = async () => {
    try {
      if (!currentVehicule.immatriculation || !currentVehicule.marque || !currentVehicule.modele) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
      }

      if (currentVehicule.id) {
        // Mise à jour
        await updateDoc(doc(db, 'vehicules', currentVehicule.id), {
          ...currentVehicule
        });
      } else {
        // Création
        await addDoc(collection(db, 'vehicules'), {
          ...currentVehicule
        });
      }

      // Rafraîchir les données
      fetchVehicules();
      handleCloseModal();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      setError('Erreur lors de l\'enregistrement');
    }
  };

  const handleAddNew = async () => {
    try {
      // Créer un nouveau véhicule avec des valeurs par défaut
      const newVehicule: Omit<Vehicule, 'id'> = {
        immatriculation: '',
        marque: '',
        modele: '',
        type: 'Voiture',
        annee: new Date().getFullYear(),
        statut: 'actif' as const,
        coursierAssigne: '',
        kilometrage: 0,
        pole: selectedPole || ''
      };

      // Ajouter le véhicule à Firestore
      const docRef = await addDoc(collection(db, 'vehicules'), newVehicule);
      
      // Ajouter le véhicule à l'état local avec l'ID en haut du tableau
      const newVehiculeWithId: Vehicule = {
        ...newVehicule,
        id: docRef.id
      };
      
      setVehicules([newVehiculeWithId, ...vehicules]); // Ajouter en haut du tableau
      setNewVehiculeId(docRef.id);
      setEditMode(true); // Activer le mode édition
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      setError('Erreur lors de l\'ajout du véhicule');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedVehicules.length === 0) return;
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedVehicules.length} véhicule(s) ?`)) {
      try {
        const deletePromises = selectedVehicules.map(id => deleteDoc(doc(db, 'vehicules', id)));
        await Promise.all(deletePromises);
        
        // Rafraîchir les données
        fetchVehicules();
        setSelectedVehicules([]);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        setError('Erreur lors de la suppression');
      }
    }
  };

  const handleCellEditCommit = async (params: any) => {
    try {
      const { id, field, value } = params;
      
      // Si c'est une nouvelle ligne et que l'immatriculation est vide, ne rien faire
      if (id === newVehiculeId && field === 'immatriculation' && !value) {
        return;
      }

      // Si c'est une nouvelle ligne et que l'immatriculation est remplie, sauvegarder
      if (id === newVehiculeId && field === 'immatriculation' && value) {
        const vehicule = vehicules.find(v => v.id === id);
        if (vehicule) {
          await updateDoc(doc(db, 'vehicules', id), {
            ...vehicule,
            [field]: value
          });
          setNewVehiculeId(null); // Réinitialiser l'ID de la nouvelle ligne
        }
      } else {
        // Mise à jour normale
        await updateDoc(doc(db, 'vehicules', id), {
          [field]: field === 'annee' || field === 'kilometrage' ? parseInt(value) : value
        });
      }
      
      // Mettre à jour l'état local
      setVehicules(vehicules.map(v => 
        v.id === id ? { ...v, [field]: value } : v
      ));
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      setError('Erreur lors de la modification');
    }
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
    if (editMode) {
      setSelectedVehicules([]);
      setNewVehiculeId(null);
    }
  };

  // Définir les colonnes
  const columns: GridColDef[] = [
    { 
      field: 'pole', 
      headerName: 'PÔLE', 
      width: 150,
      valueGetter: (params: any) => getPoleNameById(params.row?.pole),
      renderCell: (params: GridRenderCellParams) => (
        editMode ? (
          <PoleSelector
            value={params.row.pole || ''}
            onChange={(value) => handleCellEditCommit({ id: params.row.id, field: 'pole', value })}
            placeholder="Sélectionner un pôle"
            style={{ width: '100%' }}
            showSearch
            allowClear
          />
        ) : (
          getPoleNameById(params.row.pole)
        )
      ),
      editable: false,
      headerAlign: 'left',
    },
    { 
      field: 'immatriculation', 
      headerName: 'Immatriculation', 
      width: 150,
      headerAlign: 'left',
    },
    { 
      field: 'marque', 
      headerName: 'Marque', 
      width: 120,
      headerAlign: 'left',
    },
    { 
      field: 'modele', 
      headerName: 'Modèle', 
      width: 120,
      headerAlign: 'left',
    },
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        editMode ? (
          <TextField
            select
            value={params.value}
            onChange={(e) => handleCellEditCommit({ id: params.row.id, field: 'type', value: e.target.value })}
            fullWidth
            variant="standard"
          >
            <MenuItem value="Voiture">Voiture</MenuItem>
            <MenuItem value="Utilitaire">Utilitaire</MenuItem>
            <MenuItem value="Camion">Camion</MenuItem>
            <MenuItem value="Autre">Autre</MenuItem>
          </TextField>
        ) : (
          params.value
        )
      ),
      editable: false,
      headerAlign: 'left',
    },
    { 
      field: 'annee', 
      headerName: 'Année', 
      width: 100,
      type: 'number',
      headerAlign: 'right',
    },
    { 
      field: 'statut', 
      headerName: 'Statut', 
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        editMode ? (
          <TextField
            select
            value={params.value}
            onChange={(e) => handleCellEditCommit({ id: params.row.id, field: 'statut', value: e.target.value })}
            fullWidth
            variant="standard"
          >
            <MenuItem value="actif">Actif</MenuItem>
            <MenuItem value="maintenance">Maintenance</MenuItem>
            <MenuItem value="inactif">Inactif</MenuItem>
          </TextField>
        ) : (
          <span className={`status-${params.value}`}>
            {params.value === 'actif' ? 'Actif' : 
             params.value === 'maintenance' ? 'Maintenance' : 'Inactif'}
          </span>
        )
      ),
      editable: false,
      cellClassName: (params) => `status-${params.value}`,
      headerAlign: 'center',
    },
    { 
      field: 'dernierEntretien', 
      headerName: 'Dernier Entretien', 
      width: 150,
      valueFormatter: (params: any) => {
        if (!params?.value) return '-';
        const date = new Date(params.value);
        return date.toLocaleDateString('fr-FR');
      },
      headerAlign: 'center',
    },
    { 
      field: 'coursierAssigne', 
      headerName: 'Coursier Assigné', 
      width: 150,
      headerAlign: 'left',
    },
    { 
      field: 'kilometrage', 
      headerName: 'Kilométrage', 
      width: 120,
      type: 'number',
      valueFormatter: (params: any) => {
        if (!params?.value) return '0 km';
        return `${params.value} km`;
      },
      headerAlign: 'right',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Supprimer">
            <IconButton
              size="small"
              onClick={() => {
                if (window.confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) {
                  deleteDoc(doc(db, 'vehicules', params.row.id));
                  fetchVehicules();
                }
              }}
              aria-label="supprimer"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    },
  ];

  // Définir la classe de ligne en fonction de l'état
  const getRowClassName = (params: any) => {
    const { statut } = params.row;
    return `status-row-${statut}`;
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Stack 
          direction="row" 
          justifyContent="space-between" 
          alignItems="center" 
          spacing={2} 
          sx={{ mb: 3 }}
        >
          <h2 className="section-title">Véhicules</h2>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color={editMode ? "success" : "primary"}
              onClick={toggleEditMode}
              startIcon={editMode ? null : <EditIcon />}
            >
              {editMode ? "Terminer l'édition" : "Modifier"}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddNew}
              startIcon={<AddIcon />}
            >
              Ajouter
            </Button>
            {editMode && (
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteSelected}
                disabled={selectedVehicules.length === 0}
                startIcon={<DeleteIcon />}
              >
                Supprimer ({selectedVehicules.length})
              </Button>
            )}
          </Stack>
        </Stack>

        <Box sx={{ mb: 3 }}>
          <PoleFilter
            onPoleChange={handlePoleChange}
            selectedPole={selectedPole}
            label="Filtrer par pôle"
            className="pole-filter-component"
          />
        </Box>

        <DataTable
          rows={filteredVehicules}
          columns={columns}
          loading={loading}
          pageSize={10}
          checkboxSelection={editMode}
          onSelectionChange={setSelectedVehicules}
          selectionModel={selectedVehicules}
          editMode={editMode}
          onCellEditCommit={handleCellEditCommit}
          getRowClassName={getRowClassName}
        />
      </Box>

      {/* Modal pour ajouter/modifier un véhicule */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentVehicule.id ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Immatriculation"
              name="immatriculation"
              value={currentVehicule.immatriculation || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <TextField
              label="Marque"
              name="marque"
              value={currentVehicule.marque || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <TextField
              label="Modèle"
              name="modele"
              value={currentVehicule.modele || ''}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <TextField
              select
              label="Type"
              name="type"
              value={currentVehicule.type || 'Voiture'}
              onChange={handleInputChange}
              fullWidth
            >
              <MenuItem value="Voiture">Voiture</MenuItem>
              <MenuItem value="Utilitaire">Utilitaire</MenuItem>
              <MenuItem value="Camion">Camion</MenuItem>
              <MenuItem value="Autre">Autre</MenuItem>
            </TextField>
            <TextField
              label="Année"
              name="annee"
              type="number"
              value={currentVehicule.annee || ''}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              select
              label="Statut"
              name="statut"
              value={currentVehicule.statut || 'actif'}
              onChange={handleInputChange}
              fullWidth
            >
              <MenuItem value="actif">Actif</MenuItem>
              <MenuItem value="maintenance">Maintenance</MenuItem>
              <MenuItem value="inactif">Inactif</MenuItem>
            </TextField>
            <TextField
              label="Dernier entretien"
              name="dernierEntretien"
              type="date"
              value={currentVehicule.dernierEntretien || ''}
              onChange={handleInputChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Coursier assigné"
              name="coursierAssigne"
              value={currentVehicule.coursierAssigne || ''}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              label="Kilométrage"
              name="kilometrage"
              type="number"
              value={currentVehicule.kilometrage || ''}
              onChange={handleInputChange}
              fullWidth
            />
            <Box sx={{ height: 80 }}>
              <PoleSelector
                value={currentVehicule.pole || ''}
                onChange={(value) => setCurrentVehicule({...currentVehicule, pole: value})}
                placeholder="Sélectionner un pôle"
                style={{ width: '100%' }}
                showSearch
                allowClear
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {currentVehicule.id ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VehiculesMUI; 