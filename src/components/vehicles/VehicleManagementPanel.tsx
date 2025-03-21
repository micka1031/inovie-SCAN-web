import React, { useState, useEffect } from 'react';
import { Vehicle } from '../../types/Vehicle';
import { vehicleService } from '../../services/vehicleService';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DirectionsCar as CarIcon,
  Build as BuildIcon,
  HealthAndSafety as InsuranceIcon,
  Description as DescriptionIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

import VehicleDetailsPanel from './VehicleDetailsPanel';
import VehicleDocuments from './VehicleDocuments';
import VehicleInspections from './VehicleInspections';
import VehicleMaintenance from './VehicleMaintenance';
import VehicleInsurance from './VehicleInsurance';
import VehicleSpecifications from './VehicleSpecifications';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vehicle-tabpanel-${index}`}
      aria-labelledby={`vehicle-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const VehicleManagementPanel: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    brand: '',
    model: '',
    registrationNumber: '',
    type: 'car',
    status: 'active',
    purchaseDate: '',
    mileage: '',
    fuelType: 'gasoline',
    documents: [],
    inspections: [],
    maintenanceHistory: [],
    insuranceInfo: null,
    technicalSpecifications: null,
  });

  useEffect(() => {
    // Commenté temporairement pour éviter un possible problème de boucle
    loadVehicles();
    console.log("Composant monté - chargement des véhicules...");
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const vehiclesData = await vehicleService.getVehicles();
      setVehicles(vehiclesData);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des véhicules');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewVehicle({
      brand: '',
      model: '',
      registrationNumber: '',
      type: 'car',
      status: 'active',
      purchaseDate: '',
      mileage: '',
      fuelType: 'gasoline',
      documents: [],
      inspections: [],
      maintenanceHistory: [],
      insuranceInfo: null,
      technicalSpecifications: null,
    });
  };

  const handleInputChange = (field: keyof Vehicle, value: string) => {
    setNewVehicle(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveVehicle = async () => {
    try {
      setLoading(true);
      setError(null);
      if (newVehicle.id) {
        await vehicleService.updateVehicle(newVehicle.id, newVehicle);
      } else {
        await vehicleService.createVehicle(newVehicle as Vehicle);
      }
      await loadVehicles();
      handleCloseDialog();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde du véhicule');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) {
      try {
        setLoading(true);
        setError(null);
        await vehicleService.deleteVehicle(vehicleId);
        await loadVehicles();
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la suppression du véhicule');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Gestion des véhicules</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Nouveau véhicule
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Liste des véhicules
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {vehicles.map((vehicle) => (
                  <Paper
                    key={vehicle.id}
                    variant={selectedVehicle?.id === vehicle.id ? 'elevation' : 'outlined'}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      bgcolor: selectedVehicle?.id === vehicle.id ? 'primary.light' : 'background.paper',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                    onClick={() => handleVehicleSelect(vehicle)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle1">{vehicle.brand} {vehicle.model}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {vehicle.registrationNumber}
                        </Typography>
                      </Box>
                      <Box>
                        <Tooltip title="Modifier">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewVehicle(vehicle);
                              setOpenDialog(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVehicle(vehicle.id);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={9}>
            {selectedVehicle ? (
              <Paper variant="outlined">
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="vehicle tabs"
                  >
                    <Tab icon={<CarIcon />} label="Détails" />
                    <Tab icon={<DescriptionIcon />} label="Documents" />
                    <Tab icon={<BuildIcon />} label="Inspections" />
                    <Tab icon={<HistoryIcon />} label="Maintenance" />
                    <Tab icon={<InsuranceIcon />} label="Assurance" />
                    <Tab icon={<SettingsIcon />} label="Spécifications" />
                  </Tabs>
                </Box>

                <TabPanel value={tabValue} index={0}>
                  <VehicleDetailsPanel 
                    vehicle={selectedVehicle} 
                    onClose={() => setTabValue(0)} 
                    onEdit={() => {
                      setNewVehicle(selectedVehicle);
                      setOpenDialog(true);
                    }} 
                  />
                </TabPanel>
                <TabPanel value={tabValue} index={1}>
                  <VehicleDocuments vehicle={selectedVehicle} />
                </TabPanel>
                <TabPanel value={tabValue} index={2}>
                  <VehicleInspections vehicle={selectedVehicle} />
                </TabPanel>
                <TabPanel value={tabValue} index={3}>
                  <VehicleMaintenance vehicle={selectedVehicle} />
                </TabPanel>
                <TabPanel value={tabValue} index={4}>
                  <VehicleInsurance vehicle={selectedVehicle} />
                </TabPanel>
                <TabPanel value={tabValue} index={5}>
                  <VehicleSpecifications vehicle={selectedVehicle} />
                </TabPanel>
              </Paper>
            ) : (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  Sélectionnez un véhicule pour voir ses détails
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {newVehicle.id ? 'Modifier le véhicule' : 'Nouveau véhicule'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Marque"
                value={newVehicle.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Modèle"
                value={newVehicle.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Numéro d'immatriculation"
                value={newVehicle.registrationNumber}
                onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Type"
                value={newVehicle.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
              >
                <MenuItem value="car">Voiture</MenuItem>
                <MenuItem value="van">Fourgon</MenuItem>
                <MenuItem value="truck">Camion</MenuItem>
                <MenuItem value="motorcycle">Moto</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Statut"
                value={newVehicle.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                <MenuItem value="active">Actif</MenuItem>
                <MenuItem value="maintenance">En maintenance</MenuItem>
                <MenuItem value="inactive">Inactif</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date d'achat"
                type="date"
                value={newVehicle.purchaseDate}
                onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Kilométrage"
                type="number"
                value={newVehicle.mileage}
                onChange={(e) => handleInputChange('mileage', e.target.value)}
                InputProps={{
                  endAdornment: 'km'
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Type de carburant"
                value={newVehicle.fuelType}
                onChange={(e) => handleInputChange('fuelType', e.target.value)}
              >
                <MenuItem value="gasoline">Essence</MenuItem>
                <MenuItem value="diesel">Diesel</MenuItem>
                <MenuItem value="electric">Électrique</MenuItem>
                <MenuItem value="hybrid">Hybride</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleSaveVehicle}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VehicleManagementPanel; 
