import React, { useState, useCallback, useEffect } from 'react';
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
  Stack,
  InputAdornment,
  Tooltip,
  Chip
} from '@mui/material';
import { 
  DragIndicator as DragIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Save as SaveIcon,
  Timer as TimerIcon,
  Directions as DirectionsIcon,
  Info as InfoIcon,
  DirectionsCar as DirectionsCarIcon
} from '@mui/icons-material';
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
  onSaveOnly?: () => void;
}

// Ajouter ce composant séparé pour l'édition de durée avant le composant principal
const DureeVisiteInput = React.memo(({ 
  siteTournee, 
  handleDureeVisiteChange 
}: { 
  siteTournee: SiteTournee, 
  handleDureeVisiteChange: (siteId: string, dureeVisite: number) => void 
}) => {
  const [inputValue, setInputValue] = React.useState(siteTournee.dureeVisite?.toString() || "5");
  
  React.useEffect(() => {
    setInputValue(siteTournee.dureeVisite?.toString() || "5");
  }, [siteTournee.dureeVisite]);
  
  return (
    <input
      type="text"
      value={inputValue}
      onChange={(e) => {
        // Permet de vider le champ temporairement
        setInputValue(e.target.value);
        
        // Si la valeur est valide, mettre à jour réellement la durée
        const value = parseInt(e.target.value);
        if (!isNaN(value) && value > 0) {
          handleDureeVisiteChange(siteTournee.id, value);
        }
      }}
      onBlur={(e) => {
        // Lors de la perte de focus, s'assurer que la valeur est valide
        const value = parseInt(e.target.value);
        if (isNaN(value) || value <= 0) {
          // Réinitialiser à la valeur minimale de 1
          setInputValue("1");
          handleDureeVisiteChange(siteTournee.id, 1);
        } else {
          // S'assurer que la mise à jour est bien appliquée
          handleDureeVisiteChange(siteTournee.id, value);
        }
      }}
      style={{
        width: '30px',
        border: 'none',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '0.875rem',
        outline: 'none'
      }}
    />
  );
});

const TourStepsPanel: React.FC<TourStepsPanelProps> = ({ 
  tourSites, 
  allSites, 
  onSitesReordered,
  onSave,
  onSaveOnly
}) => {
  const [editingTimes, setEditingTimes] = useState<boolean>(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [totalDistance, setTotalDistance] = useState<string>("N/A");

  // Obtenir le site original à partir de l'ID unique
  const getSiteDetails = (siteTournee: SiteTournee) => {
    // Utiliser le siteId s'il existe, sinon extraire l'ID du site à partir de l'ID unique
    const originalId = siteTournee.siteId || (siteTournee.id.includes('_') ? siteTournee.id.split('_')[0] : siteTournee.id);
    return allSites[originalId];
  };

  // Gestion du drag & drop natif
  const handleDragStart = (e: React.DragEvent, index: number) => {
    console.log('Début du drag', index);
    
    // Définir l'effet de dragstart
    e.dataTransfer.effectAllowed = 'move';
    
    // Stocker l'indice de l'élément en cours de déplacement
    e.dataTransfer.setData('text/plain', index.toString());
    
    // Capturer la référence à l'élément avant le setTimeout
    const element = e.currentTarget;
    
    // Ajouter une classe CSS pour l'élément en cours de déplacement
    if (element) {
      setTimeout(() => {
        // Vérifier que l'élément existe toujours
        if (element && element.classList) {
          element.classList.add('dragging');
        }
      }, 0);
    }
    
    setDraggedItem(index);
  };
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (dragOverItem !== index) {
      setDragOverItem(index);
    }
  };
  
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    const element = e.currentTarget;
    if (element && element.classList) {
      element.classList.add('drag-over');
    }
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    const element = e.currentTarget;
    if (element && element.classList) {
      element.classList.remove('drag-over');
    }
  };
  
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    const element = e.currentTarget;
    if (element && element.classList) {
      element.classList.remove('drag-over');
    }
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    console.log('Fin du drag', { draggedItem, dragOverItem });
    
    // Capturer la référence à l'élément
    const element = e.currentTarget;
    
    // Nettoyer les classes CSS
    if (element && element.classList) {
      element.classList.remove('dragging');
    }
    
    if (draggedItem === null || dragOverItem === null || draggedItem === dragOverItem) {
      // Réinitialiser les états
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }
    
    // Réorganiser les sites
    const reorderedSites = Array.from(tourSites);
    const movedItem = reorderedSites[draggedItem];
    
    // Retirer l'élément de sa position initiale
    reorderedSites.splice(draggedItem, 1);
    
    // Insérer l'élément à sa nouvelle position
    reorderedSites.splice(dragOverItem, 0, movedItem);
    
    // Mettre à jour l'ordre
    const updatedSites = reorderedSites.map((site, index) => ({
      ...site,
      ordre: index + 1
    }));
    
    // Mettre à jour les sites
    onSitesReordered(updatedSites);
    
    // Réinitialiser les états
    setDraggedItem(null);
    setDragOverItem(null);
  };

  // Modifier l'heure d'arrivée d'un site
  const handleTimeChange = useCallback(async (siteId: string, newTime: Date) => {
    if (!newTime) return;
    
    console.log(`Modification de l'heure d'arrivée pour le site ${siteId}: ${newTime.toLocaleTimeString()}`);
    
    // Vérifier que la date est valide
    if (isNaN(newTime.getTime())) {
      console.error('Heure invalide fournie:', newTime);
      return;
    }
    
    // Mettre à jour le site avec la nouvelle heure
    const updatedSites = [...tourSites];
    const siteIndex = updatedSites.findIndex(site => site.id === siteId);
    
    if (siteIndex === -1) {
      console.error(`Site avec ID ${siteId} non trouvé`);
      return;
    }
    
    updatedSites[siteIndex] = {
      ...updatedSites[siteIndex],
      heureArrivee: newTime
    };
    
    // Récupérer les détails du site modifié
    const modifiedSite = getSiteDetails(updatedSites[siteIndex]);
    
    // Si ce n'est pas le dernier site, recalculer les heures d'arrivée pour les sites suivants
    if (siteIndex < updatedSites.length - 1) {
      console.log(`Recalcul des heures d'arrivée après modification de l'heure du site #${siteIndex + 1}`);
      
      for (let i = siteIndex + 1; i < updatedSites.length; i++) {
        const previousSite = updatedSites[i-1];
        const currentSite = updatedSites[i];
        
        // Récupérer les détails des sites
        const previousSiteDetails = getSiteDetails(previousSite);
        const currentSiteDetails = getSiteDetails(currentSite);
        
        if (previousSiteDetails && currentSiteDetails) {
          // Calculer l'heure de départ réelle en tenant compte de la durée de visite
          const previousVisitEndTime = new Date(previousSite.heureArrivee);
          previousVisitEndTime.setMinutes(previousVisitEndTime.getMinutes() + (previousSite.dureeVisite || 5));
          
          // Obtenir le temps de trajet réel avec le trafic à cette heure de départ
          const travelTimeInSeconds = await mapService.estimateTravelTime(
            previousSiteDetails, 
            currentSiteDetails,
            previousVisitEndTime
          );
          
          // Ajouter le temps de trajet
          const newArrivalTime = new Date(previousVisitEndTime);
          newArrivalTime.setSeconds(newArrivalTime.getSeconds() + travelTimeInSeconds);
          
          // Mettre à jour l'heure d'arrivée
          updatedSites[i] = {
            ...updatedSites[i],
            heureArrivee: newArrivalTime
          };
          
          console.log(`Nouvelle heure d'arrivée pour ${currentSiteDetails.nom}: ${newArrivalTime.toLocaleTimeString()} (trajet: ${Math.round(travelTimeInSeconds/60)} min)`);
        }
      }
    }
    
    // Mettre à jour les sites
    onSitesReordered(updatedSites);
  }, [tourSites, onSitesReordered, getSiteDetails]);

  // Mettre à jour la durée de visite d'un site
  const handleDureeVisiteChange = useCallback(async (siteId: string, dureeVisite: number) => {
    // Mettre à jour le site avec la nouvelle durée
    const updatedSites = tourSites.map(site => {
      if (site.id === siteId) {
        return {
          ...site,
          dureeVisite
        };
      }
      return site;
    });
    
    onSitesReordered(updatedSites);
    
    // Recalculer les heures d'arrivée des sites suivants en cascade
    const siteIndex = updatedSites.findIndex(site => site.id === siteId);
    if (siteIndex < updatedSites.length - 1) {
      console.log(`Recalcul des heures d'arrivée après modification de la durée de visite du site #${siteIndex + 1}`);
      const recalculatedSites = [...updatedSites];
      
      for (let i = siteIndex + 1; i < recalculatedSites.length; i++) {
        const previousSite = recalculatedSites[i-1];
        const currentSite = recalculatedSites[i];
        
        // Récupérer les détails des sites
        const previousSiteDetails = getSiteDetails(previousSite);
        const currentSiteDetails = getSiteDetails(currentSite);
        
        if (previousSiteDetails && currentSiteDetails) {
          // Calculer l'heure de départ réelle en tenant compte de la durée de visite
          const previousVisitEndTime = new Date(previousSite.heureArrivee);
          previousVisitEndTime.setMinutes(previousVisitEndTime.getMinutes() + (previousSite.dureeVisite || 5));
          
          // Obtenir le temps de trajet réel avec le trafic à cette heure de départ
          const travelTimeInSeconds = await mapService.estimateTravelTime(
            previousSiteDetails, 
            currentSiteDetails,
            previousVisitEndTime
          );
          
          // Ajouter le temps de trajet
          const newArrivalTime = new Date(previousVisitEndTime);
          newArrivalTime.setSeconds(newArrivalTime.getSeconds() + travelTimeInSeconds);
          
          // Mettre à jour l'heure d'arrivée
          recalculatedSites[i] = {
            ...recalculatedSites[i],
            heureArrivee: newArrivalTime
          };
          
          console.log(`Nouvelle heure d'arrivée pour ${currentSiteDetails.nom}: ${newArrivalTime.toLocaleTimeString()} (trajet: ${Math.round(travelTimeInSeconds/60)} min)`);
        }
      }
      
      onSitesReordered(recalculatedSites);
    }
  }, [tourSites, onSitesReordered, getSiteDetails]);

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
  const getTotalDistance = async (): Promise<string> => {
    if (tourSites.length < 2) return "N/A";
    
    try {
      let totalDistance = 0;
      
      for (let i = 0; i < tourSites.length - 1; i++) {
        // Récupérer les sites en utilisant la fonction getSiteDetails
        const currentSite = getSiteDetails(tourSites[i]);
        const nextSite = getSiteDetails(tourSites[i + 1]);
        
        if (currentSite && nextSite && 
            currentSite.latitude && currentSite.longitude && 
            nextSite.latitude && nextSite.longitude) {
          const distance = await mapService.calculateDistance(
            currentSite.latitude, 
            currentSite.longitude, 
            nextSite.latitude, 
            nextSite.longitude
          );
          totalDistance += distance;
        }
      }
      
      return `${totalDistance.toFixed(1)} km`;
    } catch (error) {
      console.error('Erreur lors du calcul de la distance totale:', error);
      return "Erreur de calcul";
    }
  };

  // Mettre à jour la distance totale quand les sites changent
  useEffect(() => {
    const updateTotalDistance = async () => {
      const distance = await getTotalDistance();
      setTotalDistance(distance);
    };
    updateTotalDistance();
  }, [tourSites]);

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
          onClick={onSaveOnly || onSave}
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
            <strong>Distance:</strong> {totalDistance}
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
        <List sx={{ 
          p: 0,
          '& .dragging': {
            opacity: 0.6,
            backgroundColor: 'rgba(0, 171, 85, 0.08)'
          },
          '& .drag-over': {
            borderTop: '2px dashed #00ab55'
          }
        }}>
          {tourSites.map((siteTournee, index) => {
            const site = getSiteDetails(siteTournee);
            
            if (!site) return null;
            
            return (
              <ListItem
                key={`site-${siteTournee.id}-${index}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                sx={{
                  py: 1.5,
                  backgroundColor: dragOverItem === index 
                    ? 'rgba(0, 171, 85, 0.08)' 
                    : draggedItem === index 
                      ? 'rgba(0, 171, 85, 0.04)'
                      : 'transparent',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                  cursor: 'grab',
                  transition: 'background-color 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  },
                  transform: draggedItem === index ? 'scale(1.01)' : 'none',
                  boxShadow: draggedItem === index ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
                  zIndex: draggedItem === index ? 10 : 1
                }}
              >
                <ListItemIcon>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <MarkerIcon number={index + 1} color={index === 0 ? 'primary' : index === tourSites.length - 1 ? 'error' : 'secondary'} />
                    <DragIcon color="action" sx={{ ml: 1, cursor: 'grab' }} />
                  </Box>
                </ListItemIcon>
                
                <Box sx={{ flex: 1 }}>
                  {/* Primary content */}
                  <Typography variant="body1">{site.nom}</Typography>
                  
                  {/* Secondary content */}
                  <Box sx={{ mt: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <TimeIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                      {editingTimes ? (
                        <TextField
                          type="time"
                          value={(() => {
                            try {
                              const date = new Date(siteTournee.heureArrivee);
                              return date.getHours().toString().padStart(2, '0') + ':' + 
                                     date.getMinutes().toString().padStart(2, '0');
                            } catch (e) {
                              return '00:00';
                            }
                          })()}
                          onChange={(e) => {
                            const timeStr = e.target.value;
                            try {
                              if (timeStr.includes(':')) {
                                const [hours, minutes] = timeStr.split(':').map(Number);
                                const newDate = new Date(siteTournee.heureArrivee);
                                newDate.setHours(hours);
                                newDate.setMinutes(minutes);
                                console.log(`Mise à jour de l'heure pour ${site.nom} : ${newDate.toLocaleTimeString()}`);
                                handleTimeChange(siteTournee.id, newDate);
                              }
                            } catch (err) {
                              console.error('Erreur lors de la mise à jour de l\'heure:', err);
                            }
                          }}
                          size="small"
                          sx={{ width: 120 }}
                          InputProps={{ sx: { fontSize: '0.875rem' } }}
                        />
                      ) : (
                        <Typography variant="body2">
                          {formatDateSafe(siteTournee.heureArrivee)}
                        </Typography>
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <LocationIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {site.adresse}, {site.ville}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <TimerIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                      {editingTimes ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'row', 
                            alignItems: 'center',
                            border: '1px solid #ccc',
                            borderRadius: 1,
                            p: '4px 8px',
                            width: 120
                          }}>
                            <DureeVisiteInput 
                              siteTournee={siteTournee}
                              handleDureeVisiteChange={handleDureeVisiteChange}
                            />
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              min
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                            Durée d'arrêt
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2">
                          Durée d'arrêt: {siteTournee.dureeVisite || 5} min
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Paper>
  );
};

export default TourStepsPanel; 