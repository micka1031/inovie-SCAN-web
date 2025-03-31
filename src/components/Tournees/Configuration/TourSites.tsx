import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, IconButton, List, ListItem, ListItemText, Chip, Button, ListItemSecondaryAction } from '@mui/material';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import fr from 'date-fns/locale/fr';
import DeleteIcon from '@mui/icons-material/Delete';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Site, SiteTournee } from '../../../types/tournees.types';
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
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  
  // Récupérer les détails du site
  const getSiteDetails = (siteId: string, allSites: Site[]) => {
    // Extraire l'ID original du site si nécessaire
    const originalId = siteId.includes('_') ? siteId.split('_')[0] : siteId;
    const site = allSites.find(s => s.id === originalId);
    
    if (!site) {
      console.error(`Site with id ${siteId} not found`);
      return { id: siteId, nom: 'Site inconnu', adresse: '', ville: '', codePostal: '' };
    }
    
    return site;
  };
  
  // Gestion de l'heure d'arrivée
  const handleTimeChange = useCallback((siteId: string, time: Date | null) => {
    if (!time) return;
    
    const updatedSites = sites.map(site => 
      site.id === siteId ? { ...site, heureArrivee: time } : site
    );
    
    onSitesChange(updatedSites);
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
  
  // Déplacer un site vers le haut
  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    
    const newSites = [...sites];
    const temp = newSites[index];
    newSites[index] = newSites[index - 1];
    newSites[index - 1] = temp;
    
    // Mettre à jour l'ordre
    const updatedSites = newSites.map((site, idx) => ({
      ...site,
      ordre: idx + 1
    }));
    
    onSitesChange(updatedSites);
  }, [sites, onSitesChange]);
  
  // Déplacer un site vers le bas
  const handleMoveDown = useCallback((index: number) => {
    if (index === sites.length - 1) return;
    
    const newSites = [...sites];
    const temp = newSites[index];
    newSites[index] = newSites[index + 1];
    newSites[index + 1] = temp;
    
    // Mettre à jour l'ordre
    const updatedSites = newSites.map((site, idx) => ({
      ...site,
      ordre: idx + 1
    }));
    
    onSitesChange(updatedSites);
  }, [sites, onSitesChange]);
  
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
      console.log('Drag over', index);
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
    const newSites = [...sites];
    const movedItem = newSites[draggedItem];
    
    // Retirer l'élément de sa position initiale
    newSites.splice(draggedItem, 1);
    
    // Insérer l'élément à sa nouvelle position
    newSites.splice(dragOverItem, 0, movedItem);
    
    // Mise à jour de l'ordre
    const updatedSites = newSites.map((site, index) => ({
      ...site,
      ordre: index + 1
    }));
    
    console.log('Sites réorganisés', updatedSites);
    
    // Mettre à jour les sites
    onSitesChange(updatedSites);
    
    // Réinitialiser les états
    setDraggedItem(null);
    setDragOverItem(null);
  };
  
  // Log pour débogage
  console.log('Sites dans TourSites:', sites);
  
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
      
      {!sites || sites.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Aucun site ajouté à cette tournée. Cliquez sur "Ajouter un site" pour commencer.
        </Typography>
      ) : (
        <Paper 
          elevation={2}
          sx={{ 
            maxHeight: '400px', 
            overflow: 'auto',
            border: `1px solid ${theme.palette.divider}`,
            '& .dragging': {
              opacity: 0.6,
              backgroundColor: 'rgba(0, 171, 85, 0.08)'
            },
            '& .drag-over': {
              borderTop: `2px dashed ${theme.palette.primary.main}`
            }
          }}
        >
          <List dense>
            {sites.map((siteTournee, index) => {
              const site = getSiteDetails(siteTournee.siteId || siteTournee.id, availableSites);
              
              return (
                <ListItem 
                  key={siteTournee.id} 
                  sx={{ 
                    p: 1, 
                    borderBottom: '1px solid rgba(0, 0, 0, 0.12)', 
                    backgroundColor: draggedItem === index ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, color: 'action.active' }}>
                    <DragHandleIcon />
                  </Box>
                  <Box sx={{ mr: 1 }}>
                    <Chip 
                      label={index + 1} 
                      color={index === 0 ? 'primary' : index === sites.length - 1 ? 'error' : 'default'} 
                      size="small" 
                    />
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1">{site.nom}</Typography>
                    
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {site.adresse}, {site.ville}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                          <TimePicker
                            label="Heure d'arrivée"
                            value={siteTournee.heureArrivee}
                            onChange={(newValue) => handleTimeChange(siteTournee.id, newValue)}
                            slotProps={{
                              textField: {
                                size: 'small',
                                sx: { width: 150 }
                              }
                            }}
                          />
                        </LocalizationProvider>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                            Durée d'arrêt:
                          </Typography>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'row', 
                            alignItems: 'center',
                            border: '1px solid #ccc',
                            borderRadius: 1,
                            p: '2px 8px',
                            minWidth: 70
                          }}>
                            <DurationInput 
                              siteTournee={siteTournee} 
                              sites={sites} 
                              onSitesChange={onSitesChange} 
                            />
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              min
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', ml: 1 }}>
                    <IconButton 
                      size="small" 
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      sx={{ mr: 0.5 }}
                    >
                      <KeyboardArrowUpIcon fontSize="small" />
                    </IconButton>
                    
                    <IconButton 
                      size="small" 
                      onClick={() => handleMoveDown(index)}
                      disabled={index === sites.length - 1}
                      sx={{ mr: 0.5 }}
                    >
                      <KeyboardArrowDownIcon fontSize="small" />
                    </IconButton>
                    
                    <IconButton 
                      size="small" 
                      onClick={() => handleRemoveSite(siteTournee.id)}
                      sx={{ color: theme.palette.error.main }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        </Paper>
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

const DurationInput: React.FC<{
  siteTournee: SiteTournee;
  sites: SiteTournee[];
  onSitesChange: (sites: SiteTournee[]) => void;
}> = ({ siteTournee, sites, onSitesChange }) => {
  const [inputValue, setInputValue] = React.useState(siteTournee.dureeVisite?.toString() || "5");
  
  // Mettre à jour le state local lorsque la valeur externe change
  React.useEffect(() => {
    setInputValue(siteTournee.dureeVisite?.toString() || "5");
  }, [siteTournee.dureeVisite]);
  
  const handleUpdateDuration = (newDuration: number) => {
    onSitesChange(
      sites.map(s => 
        s.id === siteTournee.id ? { ...s, dureeVisite: newDuration } : s
      )
    );
  };
  
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
          handleUpdateDuration(value);
        }
      }}
      onBlur={(e) => {
        // Lors de la perte de focus, s'assurer que la valeur est valide
        const value = parseInt(e.target.value);
        if (isNaN(value) || value <= 0) {
          // Réinitialiser à la valeur minimale de 1
          setInputValue("1");
          handleUpdateDuration(1);
        } else {
          // S'assurer que la mise à jour est bien appliquée
          handleUpdateDuration(value);
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
};

export default React.memo(TourSites);