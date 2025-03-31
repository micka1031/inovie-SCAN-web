import React, { useState } from 'react';
import { 
  TableRow, TableCell, Checkbox, 
  IconButton, TextField, Select, MenuItem,
  Tooltip, Chip
} from '@mui/material';
import { 
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Place as PlaceIcon
} from '@mui/icons-material';
import { Site } from '../../types';
import { motion } from 'framer-motion';

// Types pour les options de colonne
interface ColumnOption {
  id: keyof Site;
  label: string;
  visible: boolean;
  width?: string;
}

// Types pour les props du composant SiteRow
interface SiteRowProps {
  site: Site;
  columns: ColumnOption[];
  editMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onChange: (field: keyof Site, value: any) => void;
  onDelete: () => void;
  onGeocode: () => void;
  editingSite?: Site;
}

// Liste des types de sites disponibles
const SITE_TYPES = [
  'Laboratoire',
  'Clinique',
  'Plateau technique',
  'Point de collecte',
  'Etablissement de santé',
  'Ehpad',
  'Vétérinaire'
];

// Liste des statuts disponibles
const STATUTS = ['actif', 'inactif'];

const SiteRow: React.FC<SiteRowProps> = ({
  site,
  columns,
  editMode,
  isSelected,
  onToggleSelect,
  onChange,
  onDelete,
  onGeocode,
  editingSite
}) => {
  // État pour suivre quelle cellule est survolée pour l'expansion
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Gérer le survol d'une cellule
  const handleCellMouseEnter = (fieldId: string) => {
    setHoveredCell(fieldId);
  };

  const handleCellMouseLeave = () => {
    setHoveredCell(null);
  };

  // Utiliser la valeur éditée si disponible, sinon la valeur d'origine
  const getValue = (field: keyof Site) => {
    if (editingSite && editingSite[field] !== undefined) {
      return editingSite[field];
    }
    return site[field];
  };

  // Rendu conditionnel basé sur le mode édition
  const renderCell = (column: ColumnOption) => {
    const field = column.id;
    const value = getValue(field);
    const isHovered = hoveredCell === field;
    const expandableCellClass = 
      (field === 'adresse' || field === 'complementAdresse' || field === 'nom' || field === 'tournees') 
      ? 'site-cell-expandable' 
      : '';

    if (!editMode) {
      // Affichage spécial pour certains champs
      if (field === 'latitude' || field === 'longitude') {
        return value ? Number(value).toFixed(6) : '-';
      }
      if (field === 'tournees' && Array.isArray(value)) {
        return value.length > 0 ? (
          <div className="chips-container">
            {value.map((tournee, index) => (
              <Chip 
                key={index} 
                label={tournee} 
                size="small" 
                variant="outlined" 
                className="site-chip"
              />
            ))}
          </div>
        ) : '-';
      }
      // Valeur par défaut avec div intérieur pour permettre l'expansion au survol
      return <div className={`site-cell-content ${expandableCellClass}`}>{value || '-'}</div>;
    }

    // Mode édition - afficher des contrôles différents selon le champ
    switch (field) {
      case 'type':
        return (
          <Select
            value={value || ''}
            onChange={(e) => onChange(field, e.target.value)}
            fullWidth
            size="small"
            variant="outlined"
          >
            {SITE_TYPES.map((type) => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </Select>
        );

      case 'statut':
        return (
          <Select
            value={value || ''}
            onChange={(e) => onChange(field, e.target.value)}
            fullWidth
            size="small"
            variant="outlined"
          >
            {STATUTS.map((statut) => (
              <MenuItem key={statut} value={statut}>{statut}</MenuItem>
            ))}
          </Select>
        );

      case 'tournees':
        return (
          <div className="chips-container">
            {Array.isArray(value) && value.length > 0 
              ? value.map((tournee, index) => (
                  <Chip 
                    key={index} 
                    label={tournee} 
                    size="small" 
                    variant="outlined" 
                    onDelete={() => {
                      const newTournees = [...value];
                      newTournees.splice(index, 1);
                      onChange(field, newTournees);
                    }}
                    className="site-chip"
                  />
                ))
              : <span className="empty-field">-</span>
            }
          </div>
        );
        
      default:
        return (
          <TextField
            value={value || ''}
            onChange={(e) => onChange(field, e.target.value)}
            fullWidth
            size="small"
            variant="outlined"
          />
        );
    }
  };

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`site-row ${isSelected ? 'selected' : ''}`}
      component={TableRow}
      hover
    >
      {editMode && (
        <TableCell padding="checkbox">
          <Checkbox
            checked={isSelected}
            onChange={onToggleSelect}
          />
        </TableCell>
      )}
      
      {columns.map((column) => (
        <TableCell 
          key={column.id} 
          className="site-cell"
          onMouseEnter={() => handleCellMouseEnter(column.id)}
          onMouseLeave={handleCellMouseLeave}
          style={{ width: column.width }}
        >
          {renderCell(column)}
        </TableCell>
      ))}
      
      {editMode && (
        <TableCell className="action-cell">
          <Tooltip title="Géocoder ce site">
            <IconButton onClick={onGeocode} size="small" color="primary">
              <PlaceIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer ce site">
            <IconButton onClick={onDelete} size="small" color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </TableCell>
      )}
    </motion.tr>
  );
};

export default SiteRow; 