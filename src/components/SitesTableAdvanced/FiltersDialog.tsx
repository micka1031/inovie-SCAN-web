import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Typography,
  Divider,
  Chip,
  Box
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { Site } from '../../types';

// Type pour les filtres
interface FilterState {
  [key: string]: string | boolean | null;
}

// Props pour le composant FiltersDialog
interface FiltersDialogProps {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  sites: Site[];
}

// Liste des champs filtrables
const FILTERABLE_FIELDS = [
  { id: 'pole', label: 'Pôle' },
  { id: 'type', label: 'Type de site' },
  { id: 'ville', label: 'Ville' },
  { id: 'codePostal', label: 'Code postal' },
  { id: 'statut', label: 'Statut' }
];

const FiltersDialog: React.FC<FiltersDialogProps> = ({
  open,
  onClose,
  filters,
  onChange,
  onReset,
  sites
}) => {
  // État local pour les filtres en cours d'édition
  const [localFilters, setLocalFilters] = useState<FilterState>({ ...filters });
  
  // Fonction pour extraire les valeurs uniques pour chaque champ filtrable
  const getUniqueValues = (field: keyof Site) => {
    const values = new Set<string>();
    
    sites.forEach(site => {
      const value = site[field];
      if (value && typeof value === 'string') {
        values.add(value);
      }
    });
    
    return Array.from(values).sort();
  };
  
  // Mémoriser les options uniques pour chaque champ
  const uniqueOptions = useMemo(() => {
    return FILTERABLE_FIELDS.reduce((acc, { id }) => {
      acc[id] = getUniqueValues(id as keyof Site);
      return acc;
    }, {} as Record<string, string[]>);
  }, [sites]);
  
  // Gestion du changement d'un filtre
  const handleFilterChange = (field: string, value: string | null) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Application des filtres
  const handleApplyFilters = () => {
    onChange(localFilters);
    onClose();
  };
  
  // Réinitialisation des filtres
  const handleResetFilters = () => {
    setLocalFilters({});
    onReset();
  };
  
  // Fonction pour générer un résumé des filtres actifs
  const getActiveFiltersCount = () => {
    return Object.values(localFilters).filter(value => value !== null && value !== '').length;
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <div className="filter-dialog-title">
          <Typography variant="h6" component="span">
            Filtres avancés
          </Typography>
          {getActiveFiltersCount() > 0 && (
            <Chip 
              label={`${getActiveFiltersCount()} actif${getActiveFiltersCount() > 1 ? 's' : ''}`} 
              color="primary" 
              size="small"
              className="filter-count-chip"
            />
          )}
        </div>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent>
        <Grid container spacing={3}>
          {FILTERABLE_FIELDS.map(({ id, label }) => (
            <Grid item xs={12} sm={6} md={4} key={id}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel id={`filter-${id}-label`}>{label}</InputLabel>
                <Select
                  labelId={`filter-${id}-label`}
                  value={localFilters[id] || ''}
                  onChange={(e) => handleFilterChange(id, e.target.value as string)}
                  label={label}
                >
                  <MenuItem value="">
                    <em>Tous</em>
                  </MenuItem>
                  {uniqueOptions[id]?.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          ))}
        </Grid>
        
        {getActiveFiltersCount() > 0 && (
          <Box my={2}>
            <Typography variant="subtitle2" gutterBottom>
              Filtres actifs:
            </Typography>
            <div className="active-filters">
              {Object.entries(localFilters).map(([field, value]) => {
                if (value === null || value === '') return null;
                
                const fieldLabel = FILTERABLE_FIELDS.find(f => f.id === field)?.label || field;
                
                return (
                  <Chip
                    key={field}
                    label={`${fieldLabel}: ${value}`}
                    onDelete={() => handleFilterChange(field, null)}
                    variant="outlined"
                    size="small"
                    className="filter-chip"
                  />
                );
              })}
            </div>
          </Box>
        )}
      </DialogContent>
      
      <Divider />
      
      <DialogActions>
        <Button
          onClick={handleResetFilters}
          startIcon={<ClearIcon />}
          color="inherit"
          disabled={getActiveFiltersCount() === 0}
        >
          Effacer les filtres
        </Button>
        <Button onClick={onClose} color="inherit">
          Annuler
        </Button>
        <Button 
          onClick={handleApplyFilters} 
          color="primary" 
          variant="contained"
          startIcon={<FilterIcon />}
        >
          Appliquer les filtres
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FiltersDialog; 