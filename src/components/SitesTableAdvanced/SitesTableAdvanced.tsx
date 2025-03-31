import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Site } from '../../types';
import { 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Checkbox, 
  TextField, Button, IconButton, Tooltip, 
  Typography, Box, Chip, Pagination, 
  Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogActions, DialogContent, DialogTitle,
  CircularProgress, Alert, AlertTitle
} from '@mui/material';
import { 
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Map as MapIcon,
  GetApp as ExportIcon,
  FilterList as FilterIcon,
  ViewColumn as ColumnIcon,
  Refresh as RefreshIcon,
  Place as PlaceIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxBlankIcon
} from '@mui/icons-material';
import './SitesTableAdvanced.css';
import { motion, AnimatePresence } from 'framer-motion';
import { geocodeSimpleAddress } from '../../utils/geocoding';
import SiteRow from './SiteRow';
import NewSiteRow from './NewSiteRow';
import ColumnsDialog from './ColumnsDialog';
import FiltersDialog from './FiltersDialog';
import ConfirmDialog from './ConfirmDialog';

// Types pour les props du composant
interface SitesTableAdvancedProps {
  sites: Site[];
  onSave: (updatedSites: Site[], newSites: Partial<Site>[], deletedSiteIds: string[]) => Promise<void>;
  onDelete: (siteIds: string[]) => Promise<void>;
  onGeocodeAll: (siteIds: string[]) => Promise<void>;
  loading?: boolean;
}

// Type pour les options de sélection de colonne
interface ColumnOption {
  id: keyof Site;
  label: string;
  visible: boolean;
  width?: string;
}

// Type pour l'état de filtrage
interface FilterState {
  [key: string]: string | boolean | null;
}

const SitesTableAdvanced: React.FC<SitesTableAdvancedProps> = ({
  sites,
  onSave,
  onDelete,
  onGeocodeAll,
  loading = false
}) => {
  // État pour le mode édition
  const [editMode, setEditMode] = useState<boolean>(false);
  
  // État pour les sites sélectionnés
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  
  // État pour les sites en cours d'édition
  const [editingSites, setEditingSites] = useState<{[key: string]: Site}>({});
  
  // État pour les nouveaux sites
  const [newSites, setNewSites] = useState<Partial<Site>[]>([]);
  
  // État pour les sites supprimés
  const [deletedSiteIds, setDeletedSiteIds] = useState<string[]>([]);
  
  // État pour la recherche rapide
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // État pour les filtres avancés
  const [filters, setFilters] = useState<FilterState>({});
  
  // État pour les colonnes visibles
  const [columns, setColumns] = useState<ColumnOption[]>([
    { id: 'pole', label: 'Pôle', visible: true, width: '100px' },
    { id: 'type', label: 'Type', visible: true, width: '140px' },
    { id: 'nom', label: 'Nom', visible: true, width: '180px' },
    { id: 'adresse', label: 'Adresse', visible: true, width: '200px' },
    { id: 'complementAdresse', label: 'Complément', visible: true, width: '140px' },
    { id: 'ville', label: 'Ville', visible: true, width: '120px' },
    { id: 'codePostal', label: 'Code Postal', visible: true, width: '100px' },
    { id: 'tournees', label: 'Tournées', visible: true, width: '150px' },
    { id: 'horairesLV', label: 'Horaires L-V', visible: true, width: '120px' },
    { id: 'horairesSamedi', label: 'Horaires Samedi', visible: true, width: '120px' },
    { id: 'codeBarres', label: 'Code-Barre', visible: true, width: '120px' },
    { id: 'latitude', label: 'Latitude', visible: true, width: '100px' },
    { id: 'longitude', label: 'Longitude', visible: true, width: '100px' },
    { id: 'id', label: 'ID', visible: false, width: '220px' },
    { id: 'statut', label: 'Statut', visible: true, width: '100px' }
  ]);
  
  // État pour la pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  
  // État pour le géocodage
  const [geocodingStatus, setGeocodingStatus] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  
  // État pour les dialogues
  const [columnDialogOpen, setColumnDialogOpen] = useState<boolean>(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState<boolean>(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [confirmDialogAction, setConfirmDialogAction] = useState<string>('');

  // État pour le tri des colonnes
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Site | null;
    direction: 'ascending' | 'descending';
  }>({ key: null, direction: 'ascending' });

  // Fonction pour trier les sites
  const sortSites = useCallback((sitesToSort: Site[]) => {
    if (!sortConfig.key) return sitesToSort;
    
    return [...sitesToSort].sort((a, b) => {
      if (a[sortConfig.key!] === null || a[sortConfig.key!] === undefined) return 1;
      if (b[sortConfig.key!] === null || b[sortConfig.key!] === undefined) return -1;
      
      let aValue = a[sortConfig.key!];
      let bValue = b[sortConfig.key!];
      
      // Convertir en chaînes pour la comparaison
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      // Comparaison numérique pour les nombres
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
      }
      
      // Comparaison de chaînes pour les autres types
      if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
      
      return 0;
    });
  }, [sortConfig]);

  // Réinitialiser la sélection quand le mode édition est désactivé
  useEffect(() => {
    if (!editMode) {
      setSelectedSites([]);
      setEditingSites({});
      setNewSites([]);
      setDeletedSiteIds([]);
    }
  }, [editMode]);

  // Fonction pour filtrer les sites
  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      // Ne pas afficher les sites marqués pour suppression
      if (deletedSiteIds.includes(site.id)) return false;
      
      // Filtrer par recherche
      const matchesSearch = searchTerm.trim() === '' || Object.keys(site).some(key => {
        const value = site[key as keyof Site];
        return value && typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase());
      });
      
      // Filtrer par filtres avancés
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const siteValue = site[key as keyof Site];
        return siteValue === value;
      });
      
      return matchesSearch && matchesFilters;
    });
  }, [sites, searchTerm, filters, deletedSiteIds]);
  
  // Fonction pour trier et paginer les sites
  const sortedAndPaginatedSites = useMemo(() => {
    const sorted = sortSites(filteredSites);
    const startIndex = (page - 1) * rowsPerPage;
    return sorted.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredSites, page, rowsPerPage, sortSites]);

  // Gestion du tri par colonne
  const handleSort = useCallback((columnId: keyof Site) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === columnId) {
        // Inverser la direction si on clique sur la même colonne
        return {
          key: columnId,
          direction: prevConfig.direction === 'ascending' ? 'descending' : 'ascending'
        };
      }
      // Nouvelle colonne, tri ascendant par défaut
      return { key: columnId, direction: 'ascending' };
    });
  }, []);

  // Gestion de la sélection/désélection de tous les sites
  const handleSelectAllClick = useCallback(() => {
    if (selectedSites.length === filteredSites.length) {
      setSelectedSites([]);
    } else {
      setSelectedSites(filteredSites.map(site => site.id));
    }
  }, [filteredSites, selectedSites]);

  // Gestion de la sélection/désélection d'un site
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedSites(prev => {
      if (prev.includes(id)) {
        return prev.filter(siteId => siteId !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  // Gestion de la modification d'un site
  const handleSiteChange = useCallback((id: string, field: keyof Site, value: any) => {
    setEditingSites(prev => {
      // Si le site n'est pas déjà en cours d'édition, l'initialiser
      const currentSite = prev[id] || sites.find(site => site.id === id) || {};
      
      return {
        ...prev,
        [id]: {
          ...currentSite,
          [field]: value
        } as Site
      };
    });
  }, [sites]);

  // Gestion de l'ajout d'une nouvelle ligne
  const handleAddRow = useCallback(() => {
    const newSite: Partial<Site> = {
      id: `temp-${Date.now()}`,
      nom: '',
      pole: '',
      type: '',
      adresse: '',
      ville: '',
      codePostal: '',
      codeBarres: '',
      statut: 'actif'
    };
    
    setNewSites(prev => [newSite, ...prev]);
  }, []);

  // Gestion de la modification d'une nouvelle ligne
  const handleNewSiteChange = useCallback((index: number, field: keyof Site, value: any) => {
    setNewSites(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  }, []);

  // Gestion de la suppression d'une nouvelle ligne
  const handleRemoveNewSite = useCallback((index: number) => {
    setNewSites(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Gestion de la suppression d'un site existant
  const handleDeleteSite = useCallback((id: string) => {
    setDeletedSiteIds(prev => [...prev, id]);
    setSelectedSites(prev => prev.filter(siteId => siteId !== id));
  }, []);

  // Gestion du géocodage d'un site
  const handleGeocodeSite = useCallback(async (id: string) => {
    const site = sites.find(site => site.id === id);
    if (!site) return;
    
    setIsGeocoding(true);
    setGeocodingStatus(`Géocodage de "${site.nom}" en cours...`);
    
    try {
      const address = `${site.adresse}, ${site.codePostal} ${site.ville}, ${site.pays || 'France'}`;
      const result = await geocodeSimpleAddress(address);
      
      if (result.success) {
        handleSiteChange(id, 'latitude', result.latitude);
        handleSiteChange(id, 'longitude', result.longitude);
        setGeocodingStatus(`Géocodage réussi pour "${site.nom}"`);
      } else {
        setGeocodingStatus(`Échec du géocodage pour "${site.nom}": ${result.message}`);
      }
    } catch (error) {
      setGeocodingStatus(`Erreur lors du géocodage de "${site.nom}": ${error}`);
    } finally {
      setTimeout(() => {
        setIsGeocoding(false);
        setGeocodingStatus(null);
      }, 3000);
    }
  }, [sites, handleSiteChange]);

  // Gestion du géocodage des sites sélectionnés
  const handleGeocodeSelected = useCallback(async () => {
    if (selectedSites.length === 0) return;
    
    setIsGeocoding(true);
    setGeocodingStatus(`Préparation du géocodage pour ${selectedSites.length} sites...`);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < selectedSites.length; i++) {
        const id = selectedSites[i];
        const site = sites.find(site => site.id === id);
        
        if (!site) continue;
        
        setGeocodingStatus(`Géocodage de "${site.nom}" (${i + 1}/${selectedSites.length})...`);
        
        const address = `${site.adresse}, ${site.codePostal} ${site.ville}, ${site.pays || 'France'}`;
        const result = await geocodeSimpleAddress(address);
        
        if (result.success) {
          handleSiteChange(id, 'latitude', result.latitude);
          handleSiteChange(id, 'longitude', result.longitude);
          successCount++;
        } else {
          failCount++;
        }
        
        // Petite pause pour éviter de surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setGeocodingStatus(`Géocodage terminé: ${successCount} réussis, ${failCount} échecs`);
    } catch (error) {
      setGeocodingStatus(`Erreur lors du géocodage: ${error}`);
    } finally {
      setTimeout(() => {
        setIsGeocoding(false);
        setGeocodingStatus(null);
      }, 3000);
    }
  }, [selectedSites, sites, handleSiteChange]);

  // Gestion de la sauvegarde des modifications
  const handleSave = useCallback(async () => {
    // Créer un tableau des sites modifiés
    const updatedSites = Object.values(editingSites).filter(site => site.id && !site.id.startsWith('temp-'));
    
    try {
      await onSave(updatedSites, newSites, deletedSiteIds);
      
      // Réinitialiser les états après la sauvegarde
      setEditMode(false);
      setEditingSites({});
      setNewSites([]);
      setDeletedSiteIds([]);
      setSelectedSites([]);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      // Ici, vous pourriez afficher une notification d'erreur
    }
  }, [editingSites, newSites, deletedSiteIds, onSave]);

  // Gestion de l'annulation des modifications
  const handleCancel = useCallback(() => {
    setEditMode(false);
    setEditingSites({});
    setNewSites([]);
    setDeletedSiteIds([]);
    setSelectedSites([]);
  }, []);

  // Gestion de l'action de confirmation
  const handleConfirmDialogAction = useCallback(() => {
    switch (confirmDialogAction) {
      case 'delete':
        // Supprimer les sites sélectionnés
        setDeletedSiteIds(prev => [...prev, ...selectedSites]);
        setSelectedSites([]);
        break;
      default:
        break;
    }
  }, [confirmDialogAction, selectedSites]);

  // Gestion de l'export des sites
  const handleExport = useCallback(() => {
    // Déterminer quels sites exporter (tous ou sélectionnés)
    const sitesToExport = selectedSites.length > 0
      ? sites.filter(site => selectedSites.includes(site.id))
      : filteredSites;
    
    // Convertir en CSV ou JSON
    const dataStr = JSON.stringify(sitesToExport, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    // Créer un lien de téléchargement
    const exportFileName = `sites_export_${new Date().toISOString().slice(0, 10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  }, [sites, selectedSites, filteredSites]);
  
  // Composant principal
  return (
    <div className="sites-table-advanced">
      <div className="table-toolbar">
        <div className="search-filter-container">
          <TextField
            placeholder="Recherche rapide..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon color="action" />
            }}
            className="search-input"
          />
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setFilterDialogOpen(true)}
            className="filter-button"
          >
            Filtres
          </Button>
          <Button
            variant="outlined"
            startIcon={<ColumnIcon />}
            onClick={() => setColumnDialogOpen(true)}
            className="column-button"
          >
            Colonnes
          </Button>
          <Link 
            to="/sites" 
            style={{ 
              textDecoration: 'none', 
              marginLeft: '10px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Button
              variant="outlined"
              color="secondary"
              size="medium"
            >
              Vue standard
            </Button>
          </Link>
        </div>
        
        <div className="action-buttons">
          {!editMode ? (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<EditIcon />}
                onClick={() => setEditMode(true)}
                className="edit-button"
              >
                Éditer
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<MapIcon />}
                onClick={() => {/* Logique pour afficher la carte */}}
                className="map-button"
              >
                Carte
              </Button>
              <Button
                variant="contained"
                color="info"
                startIcon={<ExportIcon />}
                onClick={handleExport}
                className="export-button"
              >
                Exporter
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                className="save-button"
              >
                Enregistrer
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => handleCancel()}
                className="cancel-button"
              >
                Annuler
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddRow}
                className="add-button"
              >
                Ajouter
              </Button>
              {selectedSites.length > 0 && (
                <>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<PlaceIcon />}
                    onClick={handleGeocodeSelected}
                    disabled={isGeocoding}
                    className="geocode-button"
                  >
                    Géocoder {selectedSites.length} sites
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      setConfirmDialogAction('delete');
                      setConfirmDialogOpen(true);
                    }}
                    className="delete-button"
                  >
                    Supprimer {selectedSites.length} sites
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      
      {isGeocoding && (
        <Alert severity="info" className="geocoding-alert">
          <AlertTitle>Géocodage en cours</AlertTitle>
          {geocodingStatus}
          <CircularProgress size={20} className="alert-progress" />
        </Alert>
      )}
      
      <Paper elevation={3} className="table-container">
        <TableContainer className="scrollable-table">
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {editMode && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedSites.length > 0 && selectedSites.length < filteredSites.length}
                      checked={selectedSites.length > 0 && selectedSites.length === filteredSites.length}
                      onChange={handleSelectAllClick}
                    />
                  </TableCell>
                )}
                {columns.filter(col => col.visible).map((column) => (
                  <TableCell 
                    key={column.id} 
                    className="table-header-cell"
                    style={{ width: column.width }}
                    onClick={() => handleSort(column.id)}
                  >
                    {column.label}
                    {sortConfig.key === column.id && (
                      <span style={{ marginLeft: '4px' }}>
                        {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                      </span>
                    )}
                  </TableCell>
                ))}
                {editMode && <TableCell style={{ width: '110px' }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Ajouter des rangées nouvelles au début */}
              {editMode && newSites.map((site, index) => (
                <NewSiteRow 
                  key={`new-${index}`}
                  site={site}
                  index={index}
                  columns={columns.filter(col => col.visible)}
                  onChange={handleNewSiteChange}
                  onRemove={handleRemoveNewSite}
                />
              ))}
              
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.filter(col => col.visible).length + (editMode ? 2 : 0)} align="center">
                    <CircularProgress />
                    <Typography variant="body1" style={{ marginLeft: 20 }}>
                      Chargement des sites...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : sortedAndPaginatedSites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.filter(col => col.visible).length + (editMode ? 2 : 0)} align="center">
                    <Typography variant="body1">
                      Aucun site ne correspond aux critères de recherche
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sortedAndPaginatedSites.map((site) => (
                  <SiteRow
                    key={site.id}
                    site={site}
                    columns={columns.filter(col => col.visible)}
                    editMode={editMode}
                    isSelected={selectedSites.includes(site.id)}
                    onToggleSelect={() => handleToggleSelect(site.id)}
                    onChange={(field, value) => handleSiteChange(site.id, field, value)}
                    onDelete={() => handleDeleteSite(site.id)}
                    onGeocode={() => handleGeocodeSite(site.id)}
                    editingSite={editingSites[site.id]}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <div className="table-footer">
          <div className="rows-per-page">
            <Typography variant="body2" component="span">
              Lignes par page:
            </Typography>
            <Select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              size="small"
            >
              {[10, 20, 50, 100].map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </div>
          
          <Pagination 
            count={Math.ceil(filteredSites.length / rowsPerPage)} 
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary" 
            size="medium"
          />
          
          <Typography variant="body2" className="total-count">
            {filteredSites.length} sites au total
          </Typography>
        </div>
      </Paper>
      
      {/* Dialogues */}
      <ColumnsDialog
        open={columnDialogOpen}
        onClose={() => setColumnDialogOpen(false)}
        columns={columns}
        onChange={setColumns}
      />
      
      <FiltersDialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters({})}
        sites={sites}
      />
      
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmDialogAction}
        title={
          confirmDialogAction === 'delete' 
            ? `Supprimer ${selectedSites.length} site(s)` 
            : 'Confirmation'
        }
        content={
          confirmDialogAction === 'delete'
            ? `Êtes-vous sûr de vouloir supprimer ${selectedSites.length} site(s) ? Cette action est irréversible.`
            : 'Êtes-vous sûr de vouloir continuer ?'
        }
      />
    </div>
  );
};

export default SitesTableAdvanced; 