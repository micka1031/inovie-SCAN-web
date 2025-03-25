import React, { useCallback, useRef } from 'react';
import { Box, Typography, Paper, IconButton, List, ListItem, ListItemText, Chip, Button, ListItemSecondaryAction } from '@mui/material';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import fr from 'date-fns/locale/fr';
import DeleteIcon from '@mui/icons-material/Delete';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import AddIcon from '@mui/icons-material/Add';
import { Site, SiteTournee } from '../../../types/tournees.types';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useTheme } from '@mui/material';

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
  const theme = useTheme();
  
  // Référence pour tracker les IDs uniques des sites
  const uniqueIdMapRef = useRef<Map<string, string>>(new Map());
  
  // Forcer la régénération des IDs uniques pour les éléments glissables
  const getUniqueKeyForSite = useCallback((site: SiteTournee): string => {
    // Si nous avons déjà généré un ID unique pour ce site, le retourner
    const siteIdOrUniqueId = site.id;
    
    if (uniqueIdMapRef.current.has(siteIdOrUniqueId)) {
      return uniqueIdMapRef.current.get(siteIdOrUniqueId)!;
    }
    
    // Sinon, générer un nouvel ID unique et le stocker
    const uniqueKey = `${siteIdOrUniqueId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    uniqueIdMapRef.current.set(siteIdOrUniqueId, uniqueKey);
    return uniqueKey;
  }, []);

  // Gestion de l'heure d'arrivée
  const handleTimeChange = useCallback((siteId: string, time: Date | null) => {
    if (!time) return;
    
    onSitesChange(sites.map(site => 
      site.id === siteId ? { ...site, heureArrivee: time } : site
    ));
  }, [sites, onSitesChange]);
  
  // Supprimer un site
  const handleRemoveSite = useCallback((siteId: string) => {
    const updatedSites = sites.filter(site => site.id !== siteId);
    
    // Réordonner les sites restants
    const reorderedSites = updatedSites.map((site, index) => ({
      ...site,
      ordre: index + 1
    }));
    
    onSitesChange(reorderedSites);
  }, [sites, onSitesChange]);
  
  const getSiteDetails = (siteId: string, allSites: Site[]) => {
    // Extraire l'ID original du site si nécessaire (pour les sites avec ID généré format "originalId_timestamp")
    const originalId = siteId.includes('_') ? siteId.split('_')[0] : siteId;
    const site = allSites.find(s => s.id === originalId);
    
    if (!site) {
      console.error(`Site with id ${siteId} not found`);
      return { nom: 'Site inconnu', adresse: '', ville: '' };
    }
    
    return site;
  };
  
  const handleOnDragEnd = useCallback((result: DropResult) => {
    // Logging pour déboguer
    console.log('Drag result:', result);
    
    // Si pas de destination ou même position, ne rien faire
    if (!result.destination || result.destination.index === result.source.index) {
      return;
    }

    // Création d'une copie pour manipuler l'ordre
    const updatedSites = [...sites];
    const [movedSite] = updatedSites.splice(result.source.index, 1);
    updatedSites.splice(result.destination.index, 0, movedSite);
    
    // Mise à jour des indices d'ordre
    const reorderedSites = updatedSites.map((site, index) => ({
      ...site,
      ordre: index
    }));
    
    // Appel de la fonction de callback avec les sites réorganisés
    onSitesChange(reorderedSites);
  }, [sites, onSitesChange]);
  
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
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <Droppable droppableId="tour-sites">
            {(provided) => (
              <Paper 
                elevation={2}
                ref={provided.innerRef}
                {...provided.droppableProps}
                sx={{ 
                  maxHeight: '400px', 
                  overflow: 'auto',
                  border: `1px solid ${theme.palette.divider}`
                }}
              >
                <List dense>
                  {sites.map((siteTournee, index) => {
                    // Générer une clé vraiment unique pour chaque site
                    const dragId = getUniqueKeyForSite(siteTournee);
                    
                    const site = getSiteDetails(siteTournee.siteId || siteTournee.id, availableSites);
                    return (
                      <Draggable 
                        key={dragId} 
                        draggableId={dragId} 
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <ListItem
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            sx={{
                              bgcolor: snapshot.isDragging ? 'rgba(0, 171, 85, 0.08)' : 'transparent',
                              borderBottom: `1px solid ${theme.palette.divider}`,
                              '&:last-child': {
                                borderBottom: 'none'
                              }
                            }}
                          >
                            <Box 
                              {...provided.dragHandleProps}
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                cursor: 'grab'
                              }}
                            >
                              <DragHandleIcon color="action" />
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
                                    {site.nom}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box component="span">
                                  {site.adresse}
                                  <br />
                                  {site.ville}
                                  {site.codePostal && `, ${site.codePostal}`}
                                </Box>
                              }
                              sx={{ ml: 2 }}
                            />
                            
                            <ListItemSecondaryAction>
                              <IconButton 
                                edge="end"
                                aria-label="delete"
                                onClick={() => handleRemoveSite(siteTournee.id)}
                                size="small"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </List>
              </Paper>
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

export default React.memo(TourSites);