import React from 'react';
import { 
  TableRow, TableCell, TextField, Select, MenuItem,
  IconButton, Tooltip
} from '@mui/material';
import {
  DeleteOutline as DeleteIcon
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

// Types pour les props du composant NewSiteRow
interface NewSiteRowProps {
  site: Partial<Site>;
  index: number;
  columns: ColumnOption[];
  onChange: (index: number, field: keyof Site, value: any) => void;
  onRemove: (index: number) => void;
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

const NewSiteRow: React.FC<NewSiteRowProps> = ({
  site,
  index,
  columns,
  onChange,
  onRemove
}) => {
  // Rendu conditionnel des cellules basé sur le type de champ
  const renderCell = (column: ColumnOption) => {
    const field = column.id;
    const value = site[field];
    
    switch (field) {
      case 'type':
        return (
          <Select
            value={value || ''}
            onChange={(e) => onChange(index, field, e.target.value)}
            fullWidth
            size="small"
            variant="outlined"
            className="new-site-input"
          >
            {SITE_TYPES.map((type) => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </Select>
        );

      case 'statut':
        return (
          <Select
            value={value || 'actif'}
            onChange={(e) => onChange(index, field, e.target.value)}
            fullWidth
            size="small"
            variant="outlined"
            className="new-site-input"
          >
            {STATUTS.map((statut) => (
              <MenuItem key={statut} value={statut}>{statut}</MenuItem>
            ))}
          </Select>
        );
        
      case 'tournees':
        // Les tournées sont gérées séparément, pour l'instant un placeholder
        return <span className="empty-field">-</span>;
        
      default:
        return (
          <TextField
            value={value || ''}
            onChange={(e) => onChange(index, field, e.target.value)}
            fullWidth
            size="small"
            variant="outlined"
            placeholder={`Saisir ${column.label.toLowerCase()}`}
            className="new-site-input"
          />
        );
    }
  };

  return (
    <motion.tr
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: 0.3,
        delay: index * 0.05 // Animation séquentielle pour plusieurs ajouts
      }}
      className="new-site-row"
      component={TableRow}
    >
      <TableCell padding="checkbox">
        {/* Cellule vide pour l'alignement avec les checkboxes */}
      </TableCell>
      
      {columns.map((column) => (
        <TableCell 
          key={column.id} 
          className="new-site-cell"
          style={{ width: column.width }}
        >
          {renderCell(column)}
        </TableCell>
      ))}
      
      <TableCell align="right" className="action-cell">
        <Tooltip title="Supprimer cette nouvelle ligne">
          <IconButton 
            onClick={() => onRemove(index)} 
            size="small" 
            color="error"
            className="delete-button"
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </TableCell>
    </motion.tr>
  );
};

export default NewSiteRow; 