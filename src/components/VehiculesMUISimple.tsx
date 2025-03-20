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
  Paper
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { 
  DataGrid, 
  GridToolbar, 
  GridColDef, 
  GridRenderCellParams, 
  GridValueFormatter, 
  GridRowId,
  GridRowSelectionModel,
  GridColumnOrderChangeParams
} from '@mui/x-data-grid';
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

const VehiculesMUISimple: React.FC = () => {
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [filteredVehicules, setFilteredVehicules] = useState<Vehicule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicules, setSelectedVehicules] = useState<GridRowId[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedPole, setSelectedPole] = useState<string>('');
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  
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

  const [columnVisibilityModel, setColumnVisibilityModel] = useState({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  
  // Initialiser l'ordre des colonnes au chargement du composant
  useEffect(() => {
    // Extraire les noms de champ des colonnes dans l'ordre initial
    const initialColumnOrder = columns.map(column => column.field);
    setColumnOrder(initialColumnOrder);
  }, []);
  
  // Gérer la réorganisation des colonnes
  const handleColumnOrderChange = (params: GridColumnOrderChangeParams) => {
    const { column, targetIndex, oldIndex } = params;
    console.log('Colonne déplacée:', column.field, 'de', oldIndex, 'à', targetIndex);
    
    // Mettre à jour l'ordre des colonnes
    const newOrder = [...columnOrder];
    const field = newOrder.splice(oldIndex, 1)[0];
    newOrder.splice(targetIndex, 0, field);
    setColumnOrder(newOrder);
  };

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
  }, [selectedPole, vehicules]);

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
        deleteDoc(doc(db, 'vehicules', String(id)))
      );
      await Promise.all(deletePromises);
      setSelectedVehicules([]);
      fetchVehicules();
    } catch (error) {
      console.error('Erreur lors de la suppression des véhicules:', error);
      alert('Erreur lors de la suppression des véhicules');
    }
  };

  const handleCellEditCommit = async (params: any) => {
    try {
      const { id, field, value } = params;
      await updateDoc(doc(db, 'vehicules', String(id)), {
        [field]: value
      });
      fetchVehicules();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la cellule:', error);
      alert('Erreur lors de la mise à jour de la cellule');
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

  const handleSelectionChange = (newSelectionModel: GridRowSelectionModel) => {
    setSelectedVehicules(Array.from(newSelectionModel));
  };

  const columns: GridColDef[] = [
    { 
      field: 'immatriculation', 
      headerName: 'Immatriculation', 
      width: 150,
      editable: editMode,
      headerAlign: 'center',
    },
    { 
      field: 'marque', 
      headerName: 'Marque', 
      width: 150,
      editable: editMode,
      headerAlign: 'center',
    },
    { 
      field: 'modele', 
      headerName: 'Modèle', 
      width: 150,
      editable: editMode,
      headerAlign: 'center',
    },
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 120,
      editable: editMode,
      headerAlign: 'center',
    },
    { 
      field: 'annee', 
      headerName: 'Année', 
      width: 100,
      type: 'number',
      editable: editMode,
      headerAlign: 'center',
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
      editable: editMode,
      headerAlign: 'left',
    },
    { 
      field: 'kilometrage', 
      headerName: 'Kilométrage', 
      width: 120,
      type: 'number',
      editable: editMode,
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
                  deleteDoc(doc(db, 'vehicules', String(params.row.id)));
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
          <h2 className="section-title">Véhicules (MUI Simplifié)</h2>
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

        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Box sx={{ height: '70vh', width: '100%' }}>
            <DataGrid
              rows={filteredVehicules}
              columns={columns}
              loading={loading}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[5, 10, 20, 50, 100]}
              checkboxSelection={editMode}
              onRowSelectionModelChange={handleSelectionChange}
              rowSelectionModel={selectedVehicules}
              disableRowSelectionOnClick={!editMode}
              getRowClassName={getRowClassName}
              editMode="cell"
              processRowUpdate={(updatedRow, originalRow) => {
                const field = Object.keys(updatedRow).find(key => 
                  (originalRow as any)[key] !== (updatedRow as any)[key]
                );
                
                if (field) {
                  handleCellEditCommit({
                    id: updatedRow.id,
                    field,
                    value: (updatedRow as any)[field as string]
                  });
                }
                return updatedRow;
              }}
              slots={{
                toolbar: GridToolbar,
              }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                  quickFilterProps: { debounceMs: 300 },
                  csvOptions: { 
                    fileName: 'vehicules-export',
                    delimiter: ';' 
                  },
                },
              }}
              columnVisibilityModel={columnVisibilityModel}
              onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel)}
              onColumnOrderChange={handleColumnOrderChange}
              disableColumnSelector={false}
              disableColumnMenu={false}
              initialState={{
                columns: {
                  columnVisibilityModel: {},
                },
                sorting: {
                  sortModel: [{ field: 'immatriculation', sort: 'asc' }],
                },
              }}
              sx={{
                '& .MuiDataGrid-cell--editing': {
                  bgcolor: 'rgb(255,215,115, 0.19)',
                  padding: '0 !important',
                  '& .MuiInputBase-root': {
                    height: '100%',
                  },
                },
                '& .MuiDataGrid-row.Mui-selected': {
                  backgroundColor: 'rgba(0, 51, 160, 0.08)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 51, 160, 0.12)',
                  },
                },
                '& .status-actif': { 
                  color: 'green',
                  fontWeight: 'bold' 
                },
                '& .status-inactif': { 
                  color: '#888',
                  fontStyle: 'italic'
                },
                '& .status-maintenance': { 
                  color: 'orange',
                  fontWeight: 'bold' 
                },
                '& .status-row-actif': {
                  backgroundColor: 'rgba(0, 255, 0, 0.05)',
                },
                '& .status-row-inactif': {
                  backgroundColor: 'rgba(200, 200, 200, 0.1)',
                },
                '& .status-row-maintenance': {
                  backgroundColor: 'rgba(255, 165, 0, 0.05)',
                }
              }}
            />
          </Box>
        </Paper>
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

export default VehiculesMUISimple; 