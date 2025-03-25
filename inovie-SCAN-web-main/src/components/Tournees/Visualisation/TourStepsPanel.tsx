import React, { useState, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  ListItemSecondaryAction,
  IconButton,
  Button,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import { 
  DragIndicator as DragIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SiteTournee, Site } from '../../../types/tournees.types';
import MarkerIcon from './MarkerIcon';
import { mapService } from '../../../services/mapService';

interface TourStepsPanelProps {
  tourSites: SiteTournee[];
  allSites: { [key: string]: Site };
  onSitesReordered: (newSites: SiteTournee[]) => void;
  onSave: () => void;
}

const TourStepsPanel: React.FC<TourStepsPanelProps> = ({ 
  tourSites, 
  allSites, 
  onSitesReordered,
  onSave
}) => {
  const [editingTimes, setEditingTimes] = useState<boolean>(false);

  // Obtenir le site original à partir de l'ID unique
  const getSiteDetails = (siteTournee: SiteTournee) => {
    // Utiliser le siteId s'il existe, sinon extraire l'ID du site à partir de l'ID unique
    const originalId = siteTournee.siteId || (siteTournee.id.includes('_') ? siteTournee.id.split('_')[0] : siteTournee.id);
    return allSites[originalId];
  };

  // Gestion du glisser-déposer
  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source } = result;

    // Annuler si pas de destination ou si même position
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }

    // Créer une copie des sites
    const reorderedSites = Array.from(tourSites);
    
    // Déplacer l'élément
    const [movedSite] = reorderedSites.splice(source.index, 1);
    reorderedSites.splice(destination.index, 0, movedSite);
    
    // Mettre à jour l'ordre
    const updatedSites = reorderedSites.map((site, index) => ({
      ...site,
      ordre: index + 1
    }));
    
    onSitesReordered(updatedSites);
  }, [tourSites, onSitesReordered]);

  // Mettre à jour l'heure d'arrivée d'un site
  const handleTimeChange = useCallback((siteId: string, newTime: Date) => {
    const updatedSites = tourSites.map(site => {
      if (site.id === siteId) {
        return {
          ...site,
          heureArrivee: newTime
        };
      }
      return site;
    });
    
    onSitesReordered(updatedSites);
  }, [tourSites, onSitesReordered]);

  // Supprimer un site de la tournée
  const handleRemoveSite = useCallback((siteId: string) => {
    const updatedSites = tourSites
      .filter(site => site.id !== siteId)
      .map((site, index) => ({
        ...site,
        ordre: index + 1
      }));
    
    onSitesReordered(updatedSites);
  }, [tourSites, onSitesReordered]);

  // Calculer le temps total de la tournée
  const getTotalDuration = (): string => {
    if (tourSites.length < 2) return "N/A";
    
    try {
      const firstSite = tourSites[0];
      const lastSite = tourSites[tourSites.length - 1];
      
      // Vérifier que les dates sont valides
      const firstDate = new Date(firstSite.heureArrivee);
      const lastDate = new Date(lastSite.heureArrivee);
      
      if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) {
        return "Calcul impossible";
      }
      
      const startTime = firstDate.getTime();
      const endTime = lastDate.getTime();
      
      // Vérifier que l'heure de fin est après l'heure de début
      if (endTime <= startTime) {
        return "Durée invalide";
      }
      
      const durationMs = endTime - startTime;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}h ${minutes}min`;
    } catch (err) {
      console.error('Erreur lors du calcul de la durée totale:', err);
      return "Erreur de calcul";
    }
  };

  // Calculer la distance totale de la tournée
  const getTotalDistance = (): string => {
    if (tourSites.length < 2) return "N/A";
    
    let totalDistance = 0;
    
    for (let i = 0; i < tourSites.length - 1; i++) {
      // Récupérer les sites en utilisant la fonction getSiteDetails
      const currentSite = getSiteDetails(tourSites[i]);
      const nextSite = getSiteDetails(tourSites[i + 1]);
      
      if (currentSite && nextSite && 
          currentSite.latitude && currentSite.longitude && 
          nextSite.latitude && nextSite.longitude) {
        totalDistance += mapService.calculateDistance(
          currentSite.latitude, 
          currentSite.longitude, 
          nextSite.latitude, 
          nextSite.longitude
        );
      }
    }
    
    return `${totalDistance.toFixed(1)} km`;
  };

  // Bouton pour basculer entre mode affichage et édition
  const toggleEditingTimes = () => {
    setEditingTimes(!editingTimes);
  };

  // Fonction utilitaire pour formater les dates de manière sécurisée
  const formatDateSafe = (date: any): string => {
    try {
      if (!date) return 'Heure non définie';
      
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Vérifier si la date est valide
      if (isNaN(dateObj.getTime())) {
        return 'Heure invalide';
      }
      
      return format(dateObj, 'HH:mm', { locale: fr });
    } catch (err) {
      console.error('Erreur lors du formatage de la date:', err);
      return 'Heure invalide';
    }
  };

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Étapes de la tournée</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<SaveIcon />}
          onClick={onSave}
        >
          Enregistrer
        </Button>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={3} sx={{ mb: 1 }}>
          <Typography variant="body2">
            <strong>Nombre d'étapes:</strong> {tourSites.length}
          </Typography>
          <Typography variant="body2">
            <strong>Durée totale:</strong> {getTotalDuration()}
          </Typography>
          <Typography variant="body2">
            <strong>Distance:</strong> {getTotalDistance()}
          </Typography>
        </Stack>
        
        <Button 
          variant="outlined" 
          size="small"
          onClick={toggleEditingTimes}
        >
          {editingTimes ? "Terminer l'édition" : "Modifier les heures"}
        </Button>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tourSites">
            {(provided) => (
              <List
                {...provided.droppableProps}
                ref={provided.innerRef}
                sx={{ p: 0 }}
              >
                {tourSites.map((siteTournee, index) => {
                  const site = getSiteDetails(siteTournee);
                  
                  if (!site) return null;
                  
                  return (
                    <Draggable key={siteTournee.id} draggableId={siteTournee.id} index={index}>
                      {(provided) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          sx={{ 
                            mb: 1, 
                            border: '1px solid #e0e0e0', 
                            borderRadius: 1,
                            bgcolor: index === 0 ? '#e8f5e9' : index === tourSites.length - 1 ? '#ffebee' : 'white'
                          }}
                        >
                          <Box {...provided.dragHandleProps} sx={{ mr: 1, cursor: 'grab' }}>
                            <DragIcon color="action" />
                          </Box>
                          
                          <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30 }}>
                            <MarkerIcon 
                              order={index + 1}
                              color={mapService.getMarkerColor(index, tourSites.length)}
                              size={30}
                            />
                          </Box>
                          
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1" component="span">
                                {site.nom}
                              </Typography>
                            }
                            secondary={
                              <React.Fragment>
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                  <LocationIcon fontSize="small" sx={{ mr: 0.5, fontSize: '0.875rem', color: 'text.secondary' }} />
                                  <Typography variant="body2" component="span" color="text.secondary">
                                    {site.adresse}, {site.codePostal} {site.ville}
                                  </Typography>
                                </Box>
                                
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                  <TimeIcon fontSize="small" sx={{ mr: 0.5, fontSize: '0.875rem', color: 'text.secondary' }} />
                                  {editingTimes ? (
                                    <TextField
                                      type="time"
                                      value={formatDateSafe(siteTournee.heureArrivee).replace('Heure invalide', '00:00').replace('Heure non définie', '00:00')}
                                      onChange={(e) => {
                                        try {
                                          const [hours, minutes] = e.target.value.split(':').map(Number);
                                          const newDate = new Date();
                                          
                                          // S'assurer que la date est valide avant de définir les heures et minutes
                                          if (siteTournee.heureArrivee && !isNaN(new Date(siteTournee.heureArrivee).getTime())) {
                                            newDate.setTime(new Date(siteTournee.heureArrivee).getTime());
                                          }
                                          
                                          newDate.setHours(hours, minutes);
                                          handleTimeChange(siteTournee.id, newDate);
                                        } catch (err) {
                                          console.error('Erreur lors de la modification de l\'heure:', err);
                                        }
                                      }}
                                      InputProps={{ sx: { fontSize: '0.875rem' } }}
                                      size="small"
                                      sx={{ width: 110 }}
                                    />
                                  ) : (
                                    <Typography variant="body2" component="span" color="text.secondary">
                                      Arrivée: {formatDateSafe(siteTournee.heureArrivee)}
                                    </Typography>
                                  )}
                                </Box>
                              </React.Fragment>
                            }
                          />
                          
                          <ListItemSecondaryAction>
                            <IconButton 
                              edge="end" 
                              aria-label="delete"
                              onClick={() => handleRemoveSite(siteTournee.id)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
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
      </Box>
    </Paper>
  );
};

export default TourStepsPanel; 