import React, { useEffect, useState } from 'react';
import { Paper, Typography, Box, Button, List, Divider, CircularProgress } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import DirectionsIcon from '@mui/icons-material/Directions';
import SaveIcon from '@mui/icons-material/Save';
import { Site, SiteTournee } from '@/types/tournees.types';
import { mapService } from '@/services/mapService';
import './TourStepsPanel.css';

interface TourStepsPanelProps {
  tourSites: SiteTournee[];
  allSites: { [key: string]: Site };
  onSitesReordered: (sites: SiteTournee[]) => void;
  onSave: () => void;
}

const TourStepsPanel: React.FC<TourStepsPanelProps> = ({
  tourSites,
  allSites,
  onSitesReordered,
  onSave
}) => {
  const [distances, setDistances] = useState<number[]>([]);
  const [durations, setDurations] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Calculer les distances et les temps de trajet entre les sites
  useEffect(() => {
    const calculateRouteInfo = async () => {
      setLoading(true);
      
      const newDistances: number[] = [];
      const newDurations: number[] = [];
      
      // Parcourir tous les sites sauf le dernier
      for (let i = 0; i < tourSites.length - 1; i++) {
        const currentSite = allSites[tourSites[i].id];
        const nextSite = allSites[tourSites[i + 1].id];
        
        if (currentSite && nextSite) {
          // Estimation du temps de trajet
          const durationInSeconds = mapService.estimateTravelTime(currentSite, nextSite);
          newDurations.push(durationInSeconds);
          
          // Calcul simplifié de la distance à vol d'oiseau
          const R = 6371e3; // rayon de la Terre en mètres
          const φ1 = currentSite.latitude * Math.PI/180;
          const φ2 = nextSite.latitude * Math.PI/180;
          const Δφ = (nextSite.latitude - currentSite.latitude) * Math.PI/180;
          const Δλ = (nextSite.longitude - currentSite.longitude) * Math.PI/180;

          const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          
          newDistances.push(distance);
        } else {
          newDurations.push(0);
          newDistances.push(0);
        }
      }
      
      setDistances(newDistances);
      setDurations(newDurations);
      setLoading(false);
    };
    
    calculateRouteInfo();
  }, [tourSites, allSites]);

  // Gérer le drag & drop
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    // Réorganiser les sites en fonction du résultat du drag & drop
    const items = Array.from(tourSites);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Mettre à jour l'ordre des sites
    const updatedItems = items.map((site, index) => ({
      ...site,
      ordre: index + 1
    }));
    
    onSitesReordered(updatedItems);
  };

  // Calculer les totaux
  const totalDistance = distances.reduce((acc, distance) => acc + distance, 0);
  const totalDuration = durations.reduce((acc, duration) => acc + duration, 0);

  // Formater le temps en heures et minutes
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours > 0 ? hours + 'h ' : ''}${minutes}min`;
  };

  // Formater la distance en km ou m
  const formatDistance = (meters: number) => {
    return meters >= 1000 
      ? `${(meters / 1000).toFixed(1)} km` 
      : `${Math.round(meters)} m`;
  };

  return (
    <Paper 
      elevation={3} 
      className="tour-steps-panel"
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        p: 2
      }}
    >
      <Typography variant="h6" gutterBottom>
        Étapes de la tournée
      </Typography>
      
      <Box className="tour-summary" sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="subtitle2">
          Résumé de la tournée
        </Typography>
        <Typography variant="body2">
          Total: {tourSites.length} sites
        </Typography>
        <Typography variant="body2">
          Distance totale: {formatDistance(totalDistance)}
        </Typography>
        <Typography variant="body2">
          Durée estimée: {formatDuration(totalDuration)}
        </Typography>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<DirectionsIcon />} 
          onClick={onSave}
          sx={{ mr: 1 }}
        >
          Optimiser
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<SaveIcon />} 
          onClick={onSave}
        >
          Sauvegarder
        </Button>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={30} />
          </Box>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sites-list">
              {(provided) => (
                <List
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  sx={{ p: 0 }}
                >
                  {tourSites.map((siteTournee, index) => {
                    const site = allSites[siteTournee.id];
                    if (!site) return null;
                    
                    return (
                      <Draggable 
                        key={siteTournee.id} 
                        draggableId={siteTournee.id}
                        index={index}
                      >
                        {(provided) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="tour-step-item"
                            sx={{
                              p: 1.5,
                              mb: 1,
                              borderRadius: 1,
                              bgcolor: 'white',
                              border: '1px solid #e0e0e0',
                              '&:hover': {
                                bgcolor: '#f9f9f9',
                                boxShadow: 1
                              },
                              position: 'relative',
                              pl: 4
                            }}
                          >
                            <Box
                              sx={{
                                position: 'absolute',
                                left: 8,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                bgcolor: '#1976d2',
                                color: 'white',
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold'
                              }}
                            >
                              {index + 1}
                            </Box>
                            
                            <Typography variant="subtitle1" component="div" fontWeight="bold">
                              {site.nom}
                            </Typography>
                            
                            <Typography variant="body2" color="text.secondary">
                              {new Date(siteTournee.heureArrivee).toLocaleTimeString('fr-FR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </Typography>
                            
                            {index < tourSites.length - 1 && (
                              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">
                                  → {formatDistance(distances[index])}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {formatDuration(durations[index])}
                                </Typography>
                              </Box>
                            )}
                          </Box>
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
      </Box>
    </Paper>
  );
};

export default TourStepsPanel; 