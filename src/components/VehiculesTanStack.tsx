import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  ColumnOrderState,
  Row,
  RowModel,
  Column,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  Checkbox,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
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

const columnHelper = createColumnHelper<Vehicule>();

const VehiculesTanStack: React.FC = () => {
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [filteredVehicules, setFilteredVehicules] = useState<Vehicule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicules, setSelectedVehicules] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedPole, setSelectedPole] = useState<string>('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  
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
  }, [selectedPole, vehicules]);

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

  const columns = useMemo<ColumnDef<Vehicule, any>[]>(
    () => [
      columnHelper.accessor('immatriculation', {
        header: ({ column }) => <DragHandleColumnHeader column={column} />,
        cell: info => info.getValue(),
        enableSorting: true,
        enableHiding: true,
      }),
      columnHelper.accessor('marque', {
        header: ({ column }) => <DragHandleColumnHeader column={column} />,
        cell: info => info.getValue(),
        enableSorting: true,
        enableHiding: true,
      }),
      columnHelper.accessor('modele', {
        header: ({ column }) => <DragHandleColumnHeader column={column} />,
        cell: info => info.getValue(),
        enableSorting: true,
        enableHiding: true,
      }),
      columnHelper.accessor('type', {
        header: ({ column }) => <DragHandleColumnHeader column={column} />,
        cell: info => info.getValue(),
        enableSorting: true,
        enableHiding: true,
      }),
      columnHelper.accessor('annee', {
        header: ({ column }) => <DragHandleColumnHeader column={column} />,
        cell: info => info.getValue(),
        enableSorting: true,
        enableHiding: true,
      }),
      columnHelper.accessor('statut', {
        header: ({ column }) => <DragHandleColumnHeader column={column} />,
        cell: info => (
          <Chip
            label={info.getValue()}
            color={
              info.getValue() === 'actif' ? 'success' :
              info.getValue() === 'maintenance' ? 'warning' : 'default'
            }
          />
        ),
        enableSorting: true,
        enableHiding: true,
      }),
      columnHelper.accessor('dernierEntretien', {
        header: ({ column }) => <DragHandleColumnHeader column={column} />,
        cell: info => {
          const date = info.getValue();
          return date ? new Date(date).toLocaleDateString('fr-FR') : '-';
        },
        enableSorting: true,
        enableHiding: true,
      }),
      columnHelper.accessor('coursierAssigne', {
        header: ({ column }) => <DragHandleColumnHeader column={column} />,
        cell: info => info.getValue(),
        enableSorting: true,
        enableHiding: true,
      }),
      columnHelper.accessor('kilometrage', {
        header: ({ column }) => <DragHandleColumnHeader column={column} />,
        cell: info => `${info.getValue()} km`,
        enableSorting: true,
        enableHiding: true,
      }),
      columnHelper.accessor('pole', {
        header: ({ column }) => <DragHandleColumnHeader column={column} />,
        cell: info => {
          const poleId = info.getValue();
          const pole = poles.find(p => p.id === poleId);
          return pole ? pole.nom : poleId;
        },
        enableSorting: true,
        enableHiding: true,
      }),
      columnHelper.accessor('id', {
        header: ({ column }) => <DragHandleColumnHeader column={column} />,
        cell: info => (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Supprimer">
              <IconButton
                size="small"
                onClick={() => {
                  if (window.confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) {
                    deleteDoc(doc(db, 'vehicules', info.getValue()));
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
        enableSorting: false,
        enableHiding: true,
      }),
    ],
    [poles]
  );

  const table = useReactTable({
    data: filteredVehicules || [],
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      columnOrder,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const rowModel = table.getRowModel();
  const { getVirtualItems } = useVirtualizer({
    count: rowModel.rows.length,
    getScrollElement: () => document.querySelector('.table-container'),
    estimateSize: () => 35,
    overscan: 10,
  });

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

  const handleSelectionChange = (id: string) => {
    setSelectedVehicules(prev => 
      prev.includes(id) 
        ? prev.filter(v => v !== id)
        : [...prev, id]
    );
  };

  const exportToCSV = () => {
    const headers = table.getAllColumns()
      .filter(column => column.getCanHide() && column.getIsVisible())
      .map(column => column.columnDef.header as string);
    
    const rows = table.getRowModel().rows.map(row => 
      table.getAllColumns()
        .filter(column => column.getCanHide() && column.getIsVisible())
        .map(column => row.getValue(column.id))
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

  // Composant pour le drag handle des colonnes
  const DragHandleColumnHeader = ({ column }: { column: Column<Vehicule, unknown> }) => {
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', column.id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const sourceId = e.dataTransfer.getData('text/plain');
          const targetId = column.id;
          if (sourceId !== targetId) {
            const sourceIndex = table.getAllColumns().findIndex(col => col.id === sourceId);
            const targetIndex = table.getAllColumns().findIndex(col => col.id === targetId);
            const newColumnOrder = [...table.getState().columnOrder];
            const [removed] = newColumnOrder.splice(sourceIndex, 1);
            newColumnOrder.splice(targetIndex, 0, removed);
            table.setColumnOrder(newColumnOrder);
          }
        }}
        style={{ cursor: 'move', display: 'inline-flex', alignItems: 'center' }}
      >
        <DragIndicatorIcon style={{ marginRight: '8px', fontSize: '20px' }} />
        {flexRender(column.columnDef.header, column.getContext())}
      </div>
    );
  };

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
            <h2 className="section-title">Véhicules (TanStack Table)</h2>
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
            <table>
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {(() => {
                  const rowModel = table.getRowModel() as RowModel<Vehicule>;
                  return rowModel.rows.length > 0 ? (
                    rowModel.rows.map((row: Row<Vehicule>) => (
                      <tr key={row.id}>
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="text-center">
                        Aucun véhicule trouvé
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </Box>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={2}>
              <Button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                {'<<'}
              </Button>
              <Button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {'<'}
              </Button>
              <Button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                {'>'}
              </Button>
              <Button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                {'>>'}
              </Button>
            </Stack>
            <span>
              Page {table.getState().pagination.pageIndex + 1} sur{' '}
              {table.getPageCount()}
            </span>
          </Box>
        </Stack>
      </Paper>

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