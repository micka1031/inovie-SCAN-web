import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Chip, 
  IconButton, 
  Button,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { 
  DirectionsCar as DirectionsCarIcon, 
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import fr from 'date-fns/locale/fr';
import { tourneesService } from '../services/tourneesService';
import { Tournee } from '../types/tournees.types';
import { usePoles } from '../services/PoleService';

interface TourneesListProps {
  onEditTournee?: (tourneeId: string) => void;
  onViewTournee?: (tourneeId: string) => void;
  onNewTournee?: () => void;
}

const TourneesList: React.FC<TourneesListProps> = ({ onEditTournee, onViewTournee, onNewTournee }) => {
  const [tournees, setTournees] = useState<Tournee[]>([]);
  const [filteredTournees, setFilteredTournees] = useState<Tournee[]>([]);
  const [selectedPole, setSelectedPole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { poles, loading: polesLoading } = usePoles();

  useEffect(() => {
    const fetchTournees = async () => {
      try {
        setLoading(true);
        const fetchedTournees = await tourneesService.getTournees();
        // Trier par date de création, du plus récent au plus ancien
        fetchedTournees.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setTournees(fetchedTournees);
        setFilteredTournees(fetchedTournees);
      } catch (err) {
        console.error("Erreur lors du chargement des tournées:", err);
        setError("Impossible de charger les tournées. Veuillez réessayer plus tard.");
      } finally {
        setLoading(false);
      }
    };

    fetchTournees();
  }, []);

  // Filtrer les tournées quand le pôle sélectionné change
  useEffect(() => {
    if (selectedPole === '') {
      setFilteredTournees(tournees);
    } else {
      setFilteredTournees(tournees.filter(tournee => tournee.pole === selectedPole));
    }
  }, [selectedPole, tournees]);

  const handlePoleChange = (event: SelectChangeEvent) => {
    setSelectedPole(event.target.value);
  };

  const handleEditTournee = (tourneeId: string) => {
    if (onEditTournee) {
      onEditTournee(tourneeId);
    } else {
      navigate(`/tournees/edit/${tourneeId}`);
    }
  };

  const handleViewTournee = (tourneeId: string) => {
    if (onViewTournee) {
      onViewTournee(tourneeId);
    } else {
      navigate(`/tournees/view/${tourneeId}`);
    }
  };

  const handleCreateTournee = () => {
    if (onNewTournee) {
      onNewTournee();
    } else {
      navigate('/tournees/new');
    }
  };

  const handleDeleteTournee = async (tourneeId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette tournée ?')) {
      try {
        await tourneesService.deleteTournee(tourneeId);
        setTournees(tournees.filter(t => t.id !== tourneeId));
        setFilteredTournees(filteredTournees.filter(t => t.id !== tourneeId));
      } catch (err) {
        console.error("Erreur lors de la suppression de la tournée:", err);
        setError("Impossible de supprimer la tournée. Veuillez réessayer plus tard.");
      }
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Date inconnue';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (!isValid(dateObj)) {
        return 'Date invalide';
      }
      return format(dateObj, 'dd MMMM yyyy', { locale: fr });
    } catch (err) {
      return 'Date invalide';
    }
  };

  const formatTime = (date: any) => {
    if (!date) return 'Heure inconnue';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (!isValid(dateObj)) {
        return 'Heure invalide';
      }
      return format(dateObj, 'HH:mm');
    } catch (err) {
      return 'Heure invalide';
    }
  };

  // Trouver le nom du pôle à partir de son ID
  const getPoleNom = (poleId: string) => {
    const pole = poles.find(p => p.id === poleId);
    return pole ? pole.nom : 'Pôle inconnu';
  };

  if (loading || polesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ bgcolor: '#fee', p: 2, borderRadius: 1, mb: 2, color: 'error.main' }}>
        <Typography>{error}</Typography>
        <Button onClick={() => window.location.reload()} sx={{ mt: 1 }}>
          Réessayer
        </Button>
      </Box>
    );
  }

  if (tournees.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Aucune tournée n'a été créée pour le moment.
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleCreateTournee}
        >
          Créer une tournée
        </Button>
      </Paper>
    );
  }

  return (
    <Paper sx={{ mt: 2 }}>
      <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Tournées existantes</Typography>
        
        <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="filter-pole-label">Filtrer par pôle</InputLabel>
          <Select
            labelId="filter-pole-label"
            value={selectedPole}
            onChange={handlePoleChange}
            label="Filtrer par pôle"
            startAdornment={<FilterIcon fontSize="small" sx={{ mr: 0.5, color: 'action.active' }} />}
          >
            <MenuItem value="">
              <em>Tous les pôles</em>
            </MenuItem>
            {poles.map((pole) => (
              <MenuItem key={pole.id} value={pole.id}>
                {pole.nom}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      {filteredTournees.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            Aucune tournée ne correspond au filtre sélectionné.
          </Typography>
        </Box>
      ) : (
        <List sx={{ width: '100%' }}>
          {filteredTournees.map((tournee, index) => (
            <React.Fragment key={tournee.id}>
              {index > 0 && <Divider component="li" />}
              <ListItem
                alignItems="flex-start"
                secondaryAction={
                  <Box>
                    <IconButton 
                      edge="end" 
                      aria-label="view"
                      onClick={() => handleViewTournee(tournee.id)}
                      sx={{ color: 'primary.main' }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton 
                      edge="end" 
                      aria-label="edit"
                      onClick={() => handleEditTournee(tournee.id)}
                      sx={{ color: 'info.main' }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={() => handleDeleteTournee(tournee.id)}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <DirectionsCarIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {tournee.nom}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={`${tournee.sites?.length || 0} sites`} 
                        color="primary" 
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                      >
                        Pôle: {getPoleNom(tournee.pole)}
                      </Typography>
                      <Typography component="span" variant="body2" sx={{ display: 'block' }}>
                        Créée le: {formatDate(tournee.createdAt)}
                      </Typography>
                      <Typography component="span" variant="body2" sx={{ display: 'block' }}>
                        Horaires: {formatTime(tournee.heureDebut)} - {formatTime(tournee.heureFin)}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}
      
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleCreateTournee}
        >
          Créer une nouvelle tournée
        </Button>
      </Box>
    </Paper>
  );
};

export default TourneesList; 