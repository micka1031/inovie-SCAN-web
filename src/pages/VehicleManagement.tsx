import React, { useState, useEffect } from 'react';
import { Vehicle, VehicleFilters } from '../types/Vehicle';
import { vehicleService } from '../services/vehicleService';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  Slider,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';

const VehicleManagement: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filters, setFilters] = useState<VehicleFilters>({});
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Attendre un peu avant d'initialiser les véhicules
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Vérifie et initialise les véhicules par défaut si nécessaire
        await vehicleService.initializeDefaultVehicles();
        await loadVehicles();
      } catch (err) {
        console.error('Erreur d\'initialisation:', err);
        setError('Erreur lors de l\'initialisation des données');

        // Réessayer jusqu'à 3 fois avec un délai croissant
        if (retryCount < 3) {
          const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          console.log(`Nouvelle tentative dans ${retryDelay/1000}s...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, retryDelay);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [retryCount]);

  useEffect(() => {
    if (!initializing) {
      loadVehicles();
    }
  }, [filters, initializing]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const filteredVehicles = await vehicleService.getVehicles(filters);
      setVehicles(filteredVehicles);
      
      // Si aucun véhicule n'est trouvé et que nous ne sommes pas en train d'initialiser
      if (filteredVehicles.length === 0 && !initializing) {
        // Tenter de réinitialiser les véhicules par défaut
        setInitializing(true);
        await vehicleService.initializeDefaultVehicles();
        const reloadedVehicles = await vehicleService.getVehicles(filters);
        setVehicles(reloadedVehicles);
        setInitializing(false);
      }
    } catch (err) {
      setError('Erreur lors du chargement des véhicules');
      console.error('Erreur:', err);

      // Réessayer jusqu'à 3 fois avec un délai croissant
      if (retryCount < 3) {
        const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Nouvelle tentative dans ${retryDelay/1000}s...`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, retryDelay);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (vehicle?: Vehicle) => {
    setSelectedVehicle(vehicle || null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setSelectedVehicle(null);
    setOpenDialog(false);
  };

  const handleSaveVehicle = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const formData = new FormData(event.currentTarget);
      const vehicleData = {
        brand: formData.get('brand') as string,
        model: formData.get('model') as string,
        registrationNumber: formData.get('registrationNumber') as string,
        type: formData.get('type') as Vehicle['type'],
        status: formData.get('status') as Vehicle['status'],
        purchaseDate: formData.get('purchaseDate') as string,
        lastMaintenanceDate: formData.get('lastMaintenanceDate') as string,
        nextMaintenanceDate: formData.get('nextMaintenanceDate') as string,
        mileage: Number(formData.get('mileage')),
        fuelType: formData.get('fuelType') as Vehicle['fuelType'],
        capacity: formData.get('capacity') ? Number(formData.get('capacity')) : undefined,
        notes: formData.get('notes') as string,
      };

      if (selectedVehicle) {
        await vehicleService.updateVehicle(selectedVehicle.id, vehicleData);
      } else {
        await vehicleService.createVehicle(vehicleData);
      }

      handleCloseDialog();
      loadVehicles();
    } catch (err) {
      setError('Erreur lors de la sauvegarde du véhicule');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) {
      try {
        setLoading(true);
        setError(null);
        await vehicleService.deleteVehicle(id);
        loadVehicles();
      } catch (err) {
        setError('Erreur lors de la suppression du véhicule');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusColor = (status: Vehicle['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'maintenance':
        return 'warning';
      case 'inactive':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading && !vehicles.length) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {initializing ? 'Initialisation des véhicules...' : 'Chargement des véhicules...'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Gestion des Véhicules</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nouveau Véhicule
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {vehicles.length === 0 && !loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Aucun véhicule trouvé. Utilisez le bouton "Nouveau Véhicule" pour ajouter un véhicule.
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Rechercher"
                variant="outlined"
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                startIcon={<FilterListIcon />}
                onClick={() => setShowFilters(!showFilters)}
                variant={showFilters ? 'contained' : 'outlined'}
              >
                Filtres
              </Button>
            </Grid>
          </Grid>

          {showFilters && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={filters.type || ''}
                      label="Type"
                      onChange={(e) => setFilters({ ...filters, type: e.target.value as Vehicle['type'] })}
                    >
                      <MenuItem value="">Tous</MenuItem>
                      <MenuItem value="car">Voiture</MenuItem>
                      <MenuItem value="truck">Camion</MenuItem>
                      <MenuItem value="van">Van</MenuItem>
                      <MenuItem value="motorcycle">Moto</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Statut</InputLabel>
                    <Select
                      value={filters.status || ''}
                      label="Statut"
                      onChange={(e) => setFilters({ ...filters, status: e.target.value as Vehicle['status'] })}
                    >
                      <MenuItem value="">Tous</MenuItem>
                      <MenuItem value="active">Actif</MenuItem>
                      <MenuItem value="maintenance">En maintenance</MenuItem>
                      <MenuItem value="inactive">Inactif</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.needsMaintenance || false}
                        onChange={(e) => setFilters({ ...filters, needsMaintenance: e.target.checked })}
                      />
                    }
                    label="Besoin de maintenance"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {vehicles.map((vehicle) => (
          <Grid item xs={12} md={6} lg={4} key={vehicle.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">{vehicle.brand} {vehicle.model}</Typography>
                  <Box>
                    <IconButton onClick={() => handleOpenDialog(vehicle)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteVehicle(vehicle.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Immatriculation:</strong> {vehicle.registrationNumber}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Type:</strong> {vehicle.type}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Kilométrage:</strong> {vehicle.mileage} km
                  </Typography>
                  <Typography variant="body2">
                    <strong>Prochaine maintenance:</strong> {new Date(vehicle.nextMaintenanceDate).toLocaleDateString()}
                  </Typography>
                  <Chip
                    label={vehicle.status}
                    color={getStatusColor(vehicle.status)}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedVehicle ? 'Modifier le véhicule' : 'Nouveau véhicule'}
        </DialogTitle>
        <form onSubmit={handleSaveVehicle}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Marque"
                  name="brand"
                  defaultValue={selectedVehicle?.brand}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Modèle"
                  name="model"
                  defaultValue={selectedVehicle?.model}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Immatriculation"
                  name="registrationNumber"
                  defaultValue={selectedVehicle?.registrationNumber}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Type</InputLabel>
                  <Select
                    name="type"
                    label="Type"
                    defaultValue={selectedVehicle?.type}
                  >
                    <MenuItem value="car">Voiture</MenuItem>
                    <MenuItem value="truck">Camion</MenuItem>
                    <MenuItem value="van">Van</MenuItem>
                    <MenuItem value="motorcycle">Moto</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Statut</InputLabel>
                  <Select
                    name="status"
                    label="Statut"
                    defaultValue={selectedVehicle?.status}
                  >
                    <MenuItem value="active">Actif</MenuItem>
                    <MenuItem value="maintenance">En maintenance</MenuItem>
                    <MenuItem value="inactive">Inactif</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Kilométrage"
                  name="mileage"
                  type="number"
                  defaultValue={selectedVehicle?.mileage}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date d'achat"
                  name="purchaseDate"
                  type="date"
                  defaultValue={selectedVehicle?.purchaseDate}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Dernière maintenance"
                  name="lastMaintenanceDate"
                  type="date"
                  defaultValue={selectedVehicle?.lastMaintenanceDate}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Prochaine maintenance"
                  name="nextMaintenanceDate"
                  type="date"
                  defaultValue={selectedVehicle?.nextMaintenanceDate}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Type de carburant</InputLabel>
                  <Select
                    name="fuelType"
                    label="Type de carburant"
                    defaultValue={selectedVehicle?.fuelType}
                  >
                    <MenuItem value="diesel">Diesel</MenuItem>
                    <MenuItem value="petrol">Essence</MenuItem>
                    <MenuItem value="electric">Électrique</MenuItem>
                    <MenuItem value="hybrid">Hybride</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  multiline
                  rows={3}
                  defaultValue={selectedVehicle?.notes}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : (selectedVehicle ? 'Mettre à jour' : 'Créer')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default VehicleManagement; 