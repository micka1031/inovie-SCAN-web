import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  Button, 
  Stack, 
  Box, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  MenuItem, 
  IconButton, 
  Tooltip, 
  Container,
  Paper,
  Chip,
  InputAdornment,
  DialogContentText,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridColumnOrderChangeParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import SettingsIcon from '@mui/icons-material/Settings';
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
  dernierEntretien?: string | Date;
  coursierAssigne?: string;
  kilometrage: number;
  pole?: string;
}

const VehiculesTanStack: React.FC = () => {
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicules, setSelectedVehicules] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedPole, setSelectedPole] = useState<string>('');
  
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
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnTitles, setColumnTitles] = useState<{ [key: string]: string }>({});
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicules();
  }, []);

  const fetchVehicules = async () => {
    try {
      setLoading(true);
      
      const vehiculesRef = collection(db, 'vehicules');
      const snapshot = await getDocs(vehiculesRef);
      
      if (!snapshot.empty) {
        const vehiculesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Vehicule[];
        
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

  // Fonction de préparation des données pour le DataGrid
  const prepareDataForGrid = (data: Vehicule[]): Vehicule[] => {
    return data.map(vehicule => {
      const prepared = { ...vehicule };
      
      // Convertir les dates en objets Date seulement si elles sont des chaînes
      if (prepared.dernierEntretien && typeof prepared.dernierEntretien === 'string') {
        prepared.dernierEntretien = new Date(prepared.dernierEntretien);
      }
      
      // S'assurer que les valeurs numériques sont des nombres
      prepared.kilometrage = Number(prepared.kilometrage);
      prepared.annee = Number(prepared.annee);
      
      return prepared;
    });
  };

  const handleColumnOrderChange = (params: GridColumnOrderChangeParams) => {
    setColumnOrder(params.columnOrder);
  };

  const handleColumnTitleChange = (columnField: string, newTitle: string) => {
    setColumnTitles(prev => ({
      ...prev,
      [columnField]: newTitle
    }));
    setEditingColumn(null);
  };

  const handleOpenSettings = () => {
    setSettingsModalOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsModalOpen(false);
    setEditingColumn(null);
  };

  // Modifier la définition des colonnes pour utiliser les titres personnalisés
  const columns: GridColDef[] = [
    { 
      field: 'immatriculation', 
      headerName: columnTitles['immatriculation'] || 'Immatriculation', 
      width: 150,
      editable: editMode,
    },
    { 
      field: 'marque', 
      headerName: columnTitles['marque'] || 'Marque', 
      width: 150,
      editable: editMode,
    },
    { 
      field: 'modele', 
      headerName: columnTitles['modele'] || 'Modèle', 
      width: 150,
      editable: editMode,
    },
    { 
      field: 'type', 
      headerName: columnTitles['type'] || 'Type', 
      width: 150,
      editable: editMode,
      type: 'singleSelect',
      valueOptions: ['Voiture', 'Utilitaire', 'Camion', 'Autre'],
    },
    { 
      field: 'annee', 
      headerName: columnTitles['annee'] || 'Année', 
      width: 100,
      editable: editMode,
      type: 'number',
    },
    { 
      field: 'statut', 
      headerName: columnTitles['statut'] || 'Statut', 
      width: 150,
      editable: editMode,
      type: 'singleSelect',
      valueOptions: ['actif', 'maintenance', 'inactif'],
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          color={
            params.value === 'actif' ? 'success' :
            params.value === 'maintenance' ? 'warning' : 'default'
          }
        />
      ),
    },
    { 
      field: 'dernierEntretien', 
      headerName: columnTitles['dernierEntretien'] || 'Dernier entretien', 
      width: 150,
      editable: editMode,
      type: 'date',
      renderCell: (params: GridRenderCellParams) => {
        if (params.value) {
          return params.value instanceof Date 
            ? params.value.toLocaleDateString('fr-FR')
            : new Date(params.value).toLocaleDateString('fr-FR');
        }
        return '-';
      },
    },
    { 
      field: 'coursierAssigne', 
      headerName: columnTitles['coursierAssigne'] || 'Coursier assigné', 
      width: 150,
      editable: editMode,
    },
    { 
      field: 'kilometrage', 
      headerName: columnTitles['kilometrage'] || 'Kilométrage', 
      width: 150,
      editable: editMode,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => `${params.value} km`,
    },
    { 
      field: 'pole', 
      headerName: columnTitles['pole'] || 'Pôle', 
      width: 150,
      editable: editMode,
      renderCell: (params: GridRenderCellParams) => {
        if (!params.value) return '-';
        const pole = poles.find(p => p.id === params.value);
        return pole ? pole.nom : params.value;
      },
    },
    {
      field: 'actions',
      headerName: columnTitles['actions'] || 'Actions',
      width: 100,
      sortable: false,
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
      ),
    },
  ];

  const handlePoleChange = (pole: string) => {
    setSelectedPole(pole);
  };

  const handleOpenModal = (vehicule?: Vehicule) => {
    if (vehicule) {
      // Pour l'édition, préparer les valeurs correctement
      const editableVehicule = { ...vehicule };
      
      // Formater la date pour l'input de type date (YYYY-MM-DD)
      if (editableVehicule.dernierEntretien) {
        const date = editableVehicule.dernierEntretien instanceof Date 
          ? editableVehicule.dernierEntretien
          : new Date(editableVehicule.dernierEntretien);
          
        // Format YYYY-MM-DD pour l'input date HTML
        editableVehicule.dernierEntretien = date.toISOString().split('T')[0];
      } else {
        editableVehicule.dernierEntretien = "";
      }
      
      setCurrentVehicule(editableVehicule);
    } else {
      // Pour un nouveau véhicule
      setCurrentVehicule({
        immatriculation: '',
        marque: '',
        modele: '',
        type: 'Voiture',
        annee: new Date().getFullYear(),
        statut: 'actif',
        coursierAssigne: '',
        kilometrage: 0,
        dernierEntretien: ""
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Traitement spécial pour différents types de champs
    if (name === 'annee' || name === 'kilometrage') {
      setCurrentVehicule({
        ...currentVehicule,
        [name]: parseInt(value) || 0
      });
    } else {
      setCurrentVehicule({
        ...currentVehicule,
        [name]: value
      });
    }
  };

  const handleSubmit = async () => {
    try {
      if (!currentVehicule.immatriculation || !currentVehicule.marque || !currentVehicule.modele) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
      }
      
      // Préparer les données avant de les envoyer à Firestore
      const vehiculeData = { 
        ...currentVehicule,
        // Convertir les dates en chaînes pour le stockage
        dernierEntretien: currentVehicule.dernierEntretien instanceof Date 
          ? currentVehicule.dernierEntretien.toISOString()
          : currentVehicule.dernierEntretien
      };

      if (currentVehicule.id) {
        // Mise à jour
        await updateDoc(doc(db, 'vehicules', currentVehicule.id), vehiculeData);
      } else {
        // Création
        await addDoc(collection(db, 'vehicules'), vehiculeData);
      }

      // Rafraîchir les données
      fetchVehicules();
      handleCloseModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du véhicule:', error);
      alert('Erreur lors de la sauvegarde du véhicule');
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer les véhicules sélectionnés ?')) {
      return;
    }

    try {
      const deletePromises = selectedVehicules.map(id => 
        deleteDoc(doc(db, 'vehicules', id))
      );
      await Promise.all(deletePromises);
      setSelectedVehicules([]);
      fetchVehicules();
    } catch (error) {
      console.error('Erreur lors de la suppression des véhicules:', error);
      alert('Erreur lors de la suppression des véhicules');
    }
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
    if (!editMode) {
      setSelectedVehicules([]);
    }
  };

  const handleAddNew = () => {
    handleOpenModal();
  };

  const exportToCSV = () => {
    const headers = columns
      .filter(col => col.field !== 'actions')
      .map(col => col.headerName);
    
    const rows = vehicules.map(vehicule => 
      columns
        .filter(col => col.field !== 'actions')
        .map(col => {
          if (col.field === 'pole') {
            const pole = poles.find(p => p.id === vehicule[col.field as keyof Vehicule]);
            return pole ? pole.nom : vehicule[col.field as keyof Vehicule];
          }
          return vehicule[col.field as keyof Vehicule];
        })
    );

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'vehicules-export.csv';
    link.click();
  };

  // Utiliser la fonction lors du filtrage des données
  const filteredVehicules = selectedPole
    ? prepareDataForGrid(vehicules.filter(vehicule => vehicule.pole === selectedPole))
    : prepareDataForGrid(vehicules);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack 
            direction="row" 
            justifyContent="space-between" 
            alignItems="center" 
            spacing={2} 
            sx={{ mb: 3 }}
          >
            <h2 className="section-title">Véhicules (MUI DataGrid)</h2>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={handleOpenSettings}
                startIcon={<SettingsIcon />}
              >
                Paramètres des colonnes
              </Button>
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
              <Button
                variant="outlined"
                onClick={exportToCSV}
                startIcon={<FilterListIcon />}
              >
                Exporter CSV
              </Button>
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

          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={filteredVehicules}
              columns={columns}
              loading={loading}
              checkboxSelection={editMode}
              onRowSelectionModelChange={(newSelection) => {
                setSelectedVehicules(newSelection as string[]);
              }}
              columnOrder={columnOrder}
              onColumnOrderChange={handleColumnOrderChange}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
            />
          </Box>
        </Stack>
      </Paper>

      {/* Modal pour les paramètres des colonnes */}
      <Dialog open={settingsModalOpen} onClose={handleCloseSettings} maxWidth="sm" fullWidth>
        <DialogTitle>Paramètres des colonnes</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {columns.map((column) => (
              <Box key={column.field} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  label="Titre de la colonne"
                  value={editingColumn === column.field ? columnTitles[column.field] || column.headerName : columnTitles[column.field] || column.headerName}
                  onChange={(e) => {
                    if (editingColumn === column.field) {
                      handleColumnTitleChange(column.field, e.target.value);
                    }
                  }}
                  onFocus={() => setEditingColumn(column.field)}
                  onBlur={() => setEditingColumn(null)}
                  fullWidth
                />
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSettings}>Fermer</Button>
        </DialogActions>
      </Dialog>

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
              InputProps={{
                endAdornment: <InputAdornment position="end">km</InputAdornment>,
              }}
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

export default VehiculesTanStack; 