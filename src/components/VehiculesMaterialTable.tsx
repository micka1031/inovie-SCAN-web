import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  Box, 
  Button, 
  Container, 
  Stack, 
  IconButton, 
  Tooltip,
  MenuItem,
  TextField,
  Typography
} from '@mui/material';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_ColumnOrderState,
} from 'material-react-table';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
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

const VehiculesMaterialTable: React.FC = () => {
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [filteredVehicules, setFilteredVehicules] = useState<Vehicule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<Vehicule | null>(null);
  const [selectedPole, setSelectedPole] = useState<string>('');
  const [columnOrder, setColumnOrder] = useState<MRT_ColumnOrderState>([]);
  
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
      setEditingRow(newVehiculeWithId); // Commencer à éditer immédiatement
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      setError('Erreur lors de l\'ajout du véhicule');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) {
      try {
        await deleteDoc(doc(db, 'vehicules', id));
        setVehicules(vehicules.filter(v => v.id !== id));
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        setError('Erreur lors de la suppression');
      }
    }
  };

  const handleEdit = (row: MRT_Row<Vehicule>) => {
    setEditingRow(row.original);
  };

  const handleSave = async () => {
    if (!editingRow) return;
    
    try {
      // Mettre à jour dans Firestore
      await updateDoc(doc(db, 'vehicules', editingRow.id), {
        immatriculation: editingRow.immatriculation,
        marque: editingRow.marque,
        modele: editingRow.modele,
        type: editingRow.type,
        annee: editingRow.annee,
        statut: editingRow.statut,
        dernierEntretien: editingRow.dernierEntretien || '',
        coursierAssigne: editingRow.coursierAssigne || '',
        kilometrage: editingRow.kilometrage,
        pole: editingRow.pole || ''
      });
      
      // Mettre à jour l'état local
      setVehicules(vehicules.map(v => 
        v.id === editingRow.id ? editingRow : v
      ));
      
      setEditingRow(null);
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      setError('Erreur lors de la modification');
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof Vehicule) => {
    if (!editingRow) return;

    const value = e.target.value;
    setEditingRow({
      ...editingRow,
      [field]: field === 'annee' || field === 'kilometrage' 
        ? parseInt(value) 
        : value
    });
  };

  const handleSelectChange = (value: string, field: keyof Vehicule) => {
    if (!editingRow) return;

    setEditingRow({
      ...editingRow,
      [field]: value
    });
  };

  // Définir les colonnes
  const columns = useMemo<MRT_ColumnDef<Vehicule>[]>(() => [
    {
      accessorKey: 'pole',
      header: 'PÔLE',
      size: 150,
      Cell: ({ row }) => getPoleNameById(row.original.pole),
      Edit: ({ row }) => (
        <PoleSelector
          value={editingRow?.pole || ''}
          onChange={(value) => handleSelectChange(value, 'pole')}
          placeholder="Sélectionner un pôle"
          style={{ width: '100%' }}
          showSearch
          allowClear
        />
      ),
    },
    {
      accessorKey: 'immatriculation',
      header: 'Immatriculation',
      size: 150,
      Edit: ({ row }) => (
        <TextField
          value={editingRow?.immatriculation || ''}
          onChange={(e) => handleInputChange(e, 'immatriculation')}
          fullWidth
          variant="outlined"
          size="small"
        />
      ),
    },
    {
      accessorKey: 'marque',
      header: 'Marque',
      size: 120,
      Edit: ({ row }) => (
        <TextField
          value={editingRow?.marque || ''}
          onChange={(e) => handleInputChange(e, 'marque')}
          fullWidth
          variant="outlined"
          size="small"
        />
      ),
    },
    {
      accessorKey: 'modele',
      header: 'Modèle',
      size: 120,
      Edit: ({ row }) => (
        <TextField
          value={editingRow?.modele || ''}
          onChange={(e) => handleInputChange(e, 'modele')}
          fullWidth
          variant="outlined"
          size="small"
        />
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      size: 120,
      Cell: ({ row }) => row.original.type,
      Edit: ({ row }) => (
        <TextField
          select
          value={editingRow?.type || 'Voiture'}
          onChange={(e) => handleInputChange(e, 'type')}
          fullWidth
          variant="outlined"
          size="small"
        >
          <MenuItem value="Voiture">Voiture</MenuItem>
          <MenuItem value="Utilitaire">Utilitaire</MenuItem>
          <MenuItem value="Camion">Camion</MenuItem>
          <MenuItem value="Autre">Autre</MenuItem>
        </TextField>
      ),
    },
    {
      accessorKey: 'annee',
      header: 'Année',
      size: 100,
      Cell: ({ row }) => row.original.annee,
      Edit: ({ row }) => (
        <TextField
          type="number"
          value={editingRow?.annee || ''}
          onChange={(e) => handleInputChange(e, 'annee')}
          fullWidth
          variant="outlined"
          size="small"
        />
      ),
    },
    {
      accessorKey: 'statut',
      header: 'Statut',
      size: 120,
      Cell: ({ row }) => (
        <span className={`status-${row.original.statut}`}>
          {row.original.statut === 'actif' ? 'Actif' : 
           row.original.statut === 'maintenance' ? 'Maintenance' : 'Inactif'}
        </span>
      ),
      Edit: ({ row }) => (
        <TextField
          select
          value={editingRow?.statut || 'actif'}
          onChange={(e) => handleInputChange(e, 'statut')}
          fullWidth
          variant="outlined"
          size="small"
        >
          <MenuItem value="actif">Actif</MenuItem>
          <MenuItem value="maintenance">Maintenance</MenuItem>
          <MenuItem value="inactif">Inactif</MenuItem>
        </TextField>
      ),
    },
    {
      accessorKey: 'dernierEntretien',
      header: 'Dernier Entretien',
      size: 150,
      Cell: ({ row }) => {
        if (!row.original.dernierEntretien) return '-';
        const date = new Date(row.original.dernierEntretien);
        return date.toLocaleDateString('fr-FR');
      },
      Edit: ({ row }) => (
        <TextField
          type="date"
          value={editingRow?.dernierEntretien || ''}
          onChange={(e) => handleInputChange(e, 'dernierEntretien')}
          fullWidth
          variant="outlined"
          size="small"
          InputLabelProps={{ shrink: true }}
        />
      ),
    },
    {
      accessorKey: 'coursierAssigne',
      header: 'Coursier Assigné',
      size: 150,
      Edit: ({ row }) => (
        <TextField
          value={editingRow?.coursierAssigne || ''}
          onChange={(e) => handleInputChange(e, 'coursierAssigne')}
          fullWidth
          variant="outlined"
          size="small"
        />
      ),
    },
    {
      accessorKey: 'kilometrage',
      header: 'Kilométrage',
      size: 120,
      Cell: ({ row }) => `${row.original.kilometrage} km`,
      Edit: ({ row }) => (
        <TextField
          type="number"
          value={editingRow?.kilometrage || 0}
          onChange={(e) => handleInputChange(e, 'kilometrage')}
          fullWidth
          variant="outlined"
          size="small"
          InputProps={{
            endAdornment: <Typography variant="caption">km</Typography>
          }}
        />
      ),
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      size: 120,
      Cell: ({ row }) => (
        editingRow?.id === row.original.id ? (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Enregistrer">
              <IconButton
                size="small"
                onClick={handleSave}
                color="primary"
              >
                <SaveIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Annuler">
              <IconButton
                size="small"
                onClick={handleCancel}
                color="error"
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Modifier">
              <IconButton
                size="small"
                onClick={() => handleEdit(row)}
                color="primary"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Supprimer">
              <IconButton
                size="small"
                onClick={() => handleDelete(row.original.id)}
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )
      ),
      enableColumnFilter: false,
      enableSorting: false,
    },
  ], [editingRow, poles]);

  const table = useMaterialReactTable({
    columns,
    data: filteredVehicules,
    enableColumnOrdering: true,
    enableRowSelection: false,
    enableColumnResizing: true,
    enableFullScreenToggle: true,
    enableDensityToggle: true,
    enableColumnFilters: true,
    enableGlobalFilter: true,
    enablePagination: true,
    onColumnOrderChange: setColumnOrder,
    state: {
      isLoading: loading,
      columnOrder,
    },
    positionActionsColumn: 'last',
    renderTopToolbarCustomActions: () => (
      <Button
        variant="contained"
        color="primary"
        onClick={handleAddNew}
        startIcon={<AddIcon />}
      >
        Ajouter
      </Button>
    ),
    localization: {
      actions: 'Actions',
      and: 'et',
      cancel: 'Annuler',
      clearFilter: 'Effacer le filtre',
      clearSearch: 'Effacer la recherche',
      columnActions: 'Actions de colonne',
      edit: 'Modifier',
      filterByColumn: 'Filtrer par {column}',
      groupByColumn: 'Grouper par {column}',
      groupedBy: 'Groupé par ',
      hideAll: 'Masquer tout',
      hideColumn: 'Masquer la colonne {column}',
      rowActions: 'Actions de ligne',
      save: 'Enregistrer',
      search: 'Rechercher',
      selectedCountOfRowCountRowsSelected: '{selectedCount} de {rowCount} ligne(s) sélectionnée(s)',
      showAll: 'Afficher tout',
      showHideColumns: 'Afficher/Masquer les colonnes',
      showHideFilters: 'Afficher/Masquer les filtres',
      showHideSearch: 'Afficher/Masquer la recherche',
      sortByColumnAsc: 'Trier par {column} croissant',
      sortByColumnDesc: 'Trier par {column} décroissant',
      thenBy: 'puis par ',
      toggleFullScreen: 'Basculer en plein écran',
      toggleDensity: 'Ajuster la densité',
      noRecordsToDisplay: 'Aucun enregistrement à afficher',
      noResultsFound: 'Aucun résultat trouvé',
    },
  });

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
        </Stack>

        <Box sx={{ mb: 3 }}>
          <PoleFilter
            onPoleChange={handlePoleChange}
            selectedPole={selectedPole}
            label="Filtrer par pôle"
            className="pole-filter-component"
          />
        </Box>

        <MaterialReactTable table={table} />
      </Box>
    </Container>
  );
};

export default VehiculesMaterialTable; 