import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  IconButton,
  Typography,
  Divider,
  TextField,
  Tooltip
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  CheckBoxOutlineBlank as CheckBoxBlankIcon,
  CheckBox as CheckBoxIcon,
  FormatLineSpacing as WidthIcon
} from '@mui/icons-material';
import { Site } from '../../types';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// Type pour les options de colonne
interface ColumnOption {
  id: keyof Site;
  label: string;
  visible: boolean;
  width?: string;
}

// Props pour le composant ColumnsDialog
interface ColumnsDialogProps {
  open: boolean;
  onClose: () => void;
  columns: ColumnOption[];
  onChange: (columns: ColumnOption[]) => void;
}

const ColumnsDialog: React.FC<ColumnsDialogProps> = ({
  open,
  onClose,
  columns,
  onChange
}) => {
  // État local pour les modifications de colonnes
  const [localColumns, setLocalColumns] = useState<ColumnOption[]>([...columns]);
  // État pour le mode d'édition des largeurs
  const [editingWidths, setEditingWidths] = useState(false);
  
  // Gestion de la visibilité des colonnes
  const handleToggleColumn = (id: keyof Site) => {
    const updatedColumns = localColumns.map(col => 
      col.id === id ? { ...col, visible: !col.visible } : col
    );
    setLocalColumns(updatedColumns);
  };
  
  // Gestion du drag & drop pour réorganiser les colonnes
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(localColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setLocalColumns(items);
  };
  
  // Gestion de la modification de largeur d'une colonne
  const handleWidthChange = (id: keyof Site, width: string) => {
    const updatedColumns = localColumns.map(col => 
      col.id === id ? { ...col, width } : col
    );
    setLocalColumns(updatedColumns);
  };
  
  // Sauvegarde des modifications
  const handleSave = () => {
    onChange(localColumns);
    onClose();
  };
  
  // Sélection/désélection de toutes les colonnes
  const handleSelectAll = (selected: boolean) => {
    const updatedColumns = localColumns.map(col => ({ ...col, visible: selected }));
    setLocalColumns(updatedColumns);
  };
  
  // Réinitialisation aux valeurs par défaut
  const handleReset = () => {
    setLocalColumns([...columns]);
    setEditingWidths(false);
  };
  
  // Valider que la valeur de largeur est correcte
  const validateWidth = (width: string): string => {
    if (!width) return '';
    
    // Accepter uniquement les valeurs comme "100px", "10%", etc.
    if (/^\d+(%|px|em|rem|vw)$/.test(width)) {
      return width;
    }
    
    // Si c'est juste un nombre, ajouter "px"
    if (/^\d+$/.test(width)) {
      return `${width}px`;
    }
    
    return width;
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Configuration des colonnes</Typography>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent>
        <div className="columns-dialog-toolbar">
          <Button
            onClick={() => handleSelectAll(true)}
            startIcon={<CheckBoxIcon />}
            size="small"
          >
            Tout sélectionner
          </Button>
          <Button
            onClick={() => handleSelectAll(false)}
            startIcon={<CheckBoxBlankIcon />}
            size="small"
          >
            Tout désélectionner
          </Button>
          <Button
            onClick={handleReset}
            size="small"
          >
            Réinitialiser
          </Button>
          <Button
            onClick={() => setEditingWidths(!editingWidths)}
            startIcon={<WidthIcon />}
            size="small"
            color={editingWidths ? "primary" : "inherit"}
            variant={editingWidths ? "contained" : "text"}
          >
            {editingWidths ? "Masquer largeurs" : "Modifier largeurs"}
          </Button>
        </div>
        
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Faites glisser les colonnes pour réorganiser l'ordre d'affichage
        </Typography>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="columns">
            {(provided) => (
              <List
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="column-list"
              >
                {localColumns.map((column, index) => (
                  <Draggable key={column.id.toString()} draggableId={column.id.toString()} index={index}>
                    {(provided) => (
                      <ListItem
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="column-list-item"
                      >
                        <div {...provided.dragHandleProps} className="drag-handle">
                          <DragIcon />
                        </div>
                        <Checkbox
                          checked={column.visible}
                          onChange={() => handleToggleColumn(column.id)}
                          color="primary"
                        />
                        <ListItemText primary={column.label} />
                        
                        {editingWidths && (
                          <Tooltip title="Largeur de colonne (ex: 100px, 10%)">
                            <TextField
                              value={column.width || ''}
                              onChange={(e) => handleWidthChange(column.id, validateWidth(e.target.value))}
                              placeholder="Largeur"
                              size="small"
                              variant="outlined"
                              style={{ width: '100px', marginLeft: '8px' }}
                            />
                          </Tooltip>
                        )}
                      </ListItem>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </List>
            )}
          </Droppable>
        </DragDropContext>
      </DialogContent>
      
      <Divider />
      
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Annuler
        </Button>
        <Button 
          onClick={handleSave} 
          color="primary" 
          variant="contained"
        >
          Appliquer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColumnsDialog; 