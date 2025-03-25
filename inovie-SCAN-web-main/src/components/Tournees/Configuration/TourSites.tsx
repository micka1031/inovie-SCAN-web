import React from 'react';
import { Box, Typography, Paper, IconButton, List, ListItem, ListItemText, Chip, Button } from '@mui/material';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import fr from 'date-fns/locale/fr';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddIcon from '@mui/icons-material/Add';
import { Site, SiteTournee } from '../../../types/tournees.types';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface TourSitesProps {
  sites?: SiteTournee[];
  availableSites?: Site[];
  onSitesChange: (sites: SiteTournee[]) => void;
  onAddSite: () => void;
  onBack: () => void;
  onNext: () => void;
}

const TourSites: React.FC<TourSitesProps> = ({
  sites = [],
  availableSites = [],
  onSitesChange,
  onAddSite,
  onBack,
  onNext
}) => {
  // Gestion de l'heure d'arrivée
  const handleTimeChange = (siteId: string, time: Date | null) => {
    if (!time) return;
    
    const updatedSites = sites.map(site => 
      site.id === siteId ? { ...site, heureArrivee: time } : site
    );
    
    onSitesChange(updatedSites);
  };
  
  // Supprimer un site
  const handleRemoveSite = (siteId: string) => {
    const updatedSites = sites.filter(site => site.id !== siteId);
    
    // Réordonner les sites restants
    const reorderedSites = updatedSites.map((site, index) => ({
      ...site,
      ordre: index + 1
    }));
    
    onSitesChange(reorderedSites);
  };
  
  // Gestion du drag & drop pour réordonner les sites
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(sites);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Mettre à jour l'ordre
    const updatedSites = items.map((site, index) => ({
      ...site,
      ordre: index + 1
    }));
    
    onSitesChange(updatedSites);
  };
  
  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Sites de la tournée
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="outlined" 
          startIcon={<AddIcon />} 
          onClick={onAddSite}
          sx={{ mb: 2 }}
        >
          Ajouter un site
        </Button>
      </Box>
      
      {sites && sites.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Aucun site ajouté à cette tournée. Cliquez sur "Ajouter un site" pour commencer.
        </Typography>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sites-list">
            {(provided) => (
              <List {...provided.droppableProps} ref={provided.innerRef}>
                {sites.map((siteTournee, index) => {
                  const siteInfo = siteTournee.site || 
                    (availableSites.find(s => s.id === siteTournee.id)) || 
                    { nom: 'Site inconnu', adresse: '', ville: '', codePostal: '' };
                  
                  return (
                    <Draggable 
                      key={siteTournee.id} 
                      draggableId={siteTournee.id} 
                      index={index}
                    >
                      {(provided) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          sx={{ 
                            border: '1px solid #e0e0e0', 
                            borderRadius: 1, 
                            mb: 1,
                            bgcolor: '#f9f9f9'
                          }}
                        >
                          <Box {...provided.dragHandleProps} sx={{ mr: 1 }}>
                            <DragIndicatorIcon color="action" />
                          </Box>
                          
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Chip 
                                  label={`#${siteTournee.ordre}`} 
                                  size="small" 
                                  color="primary" 
                                  sx={{ mr: 1 }}
                                />
                                <Typography variant="subtitle1">
                                  {siteInfo.nom}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {siteInfo.adresse}, {siteInfo.codePostal} {siteInfo.ville}
                                </Typography>
                                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                                  <TimePicker
                                    label="Heure d'arrivée prévue"
                                    value={siteTournee.heureArrivee}
                                    onChange={(newValue) => handleTimeChange(siteTournee.id, newValue)}
                                    slotProps={{
                                      textField: {
                                        size: 'small',
                                        sx: { mt: 1, width: '100%', maxWidth: '200px' }
                                      }
                                    }}
                                  />
                                </LocalizationProvider>
                              </Box>
                            }
                          />
                          
                          <IconButton 
                            edge="end" 
                            aria-label="delete" 
                            onClick={() => handleRemoveSite(siteTournee.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItem>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </List>
            )}
          </Droppable>
        </DragDropContext>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button variant="outlined" onClick={onBack}>
          Retour
        </Button>
        
        <Button 
          variant="contained" 
          onClick={onNext}
          disabled={!sites || sites.length === 0}
        >
          Continuer
        </Button>
      </Box>
    </Paper>
  );
};

export default TourSites;