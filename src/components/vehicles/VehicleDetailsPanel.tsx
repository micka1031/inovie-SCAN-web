import React, { useState } from 'react';
import { Vehicle } from '../../types/Vehicle';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Chip,
  Divider,
  Button,
  Avatar,
  Stack,
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  LocalGasStation as GasIcon,
  Speed as SpeedIcon,
  CalendarToday as CalendarIcon,
  Build as BuildIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as InspectionIcon,
  Description as DocumentIcon,
  HealthAndSafety as InsuranceIcon,
  Settings as SpecificationsIcon,
} from '@mui/icons-material';
import VehicleDocuments from './VehicleDocuments';
import VehicleInspections from './VehicleInspections';
import VehicleMaintenance from './VehicleMaintenance';
import VehicleSpecifications from './VehicleSpecifications';
import VehicleInsurance from './VehicleInsurance';

interface VehicleDetailsPanelProps {
  vehicle: Vehicle;
  onClose: () => void;
  onEdit: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vehicle-tabpanel-${index}`}
      aria-labelledby={`vehicle-tab-${index}`}
      {...other}
      style={{ padding: '20px 0' }}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

const VehicleDetailsPanel: React.FC<VehicleDetailsPanelProps> = ({ vehicle, onClose, onEdit }) => {
  const [tabValue, setTabValue] = useState(0);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const getStatusColor = (status: string) => {
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
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon />;
      case 'maintenance':
        return <BuildIcon />;
      case 'inactive':
        return <WarningIcon />;
      default:
        return <CheckCircleIcon />;
    }
  };
  
  const getVehicleTypeIcon = (type: string) => {
    switch (type) {
      case 'car':
        return <CarIcon />;
      case 'van':
        return <CarIcon />;
      case 'truck':
        return <CarIcon />;
      case 'motorcycle':
        return <CarIcon />;
      default:
        return <CarIcon />;
    }
  };

  // Calculer les dates de maintenance
  const lastMaintenanceDate = vehicle.maintenanceHistory && vehicle.maintenanceHistory.length > 0 
    ? vehicle.maintenanceHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date 
    : null;

  const nextDueDate = vehicle.maintenanceHistory && vehicle.maintenanceHistory.length > 0 
    ? vehicle.maintenanceHistory
        .filter(m => m.nextDueDate)
        .sort((a, b) => new Date(a.nextDueDate || '').getTime() - new Date(b.nextDueDate || '').getTime())[0]?.nextDueDate 
    : null;
  
  return (
    <Paper sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 60, height: 60 }}>
            {getVehicleTypeIcon(vehicle.type)}
          </Avatar>
          <Box>
            <Typography variant="h4">
              {vehicle.brand} {vehicle.model}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {vehicle.registrationNumber}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip 
                icon={getStatusIcon(vehicle.status)}
                label={vehicle.status} 
                color={getStatusColor(vehicle.status) as any} 
                size="small"
                sx={{ mr: 1 }}
              />
              <Chip 
                label={vehicle.type ? vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1) : '-'} 
                variant="outlined" 
                size="small"
                sx={{ mr: 1 }}
              />
              <Chip 
                label={vehicle.fuelType ? vehicle.fuelType.charAt(0).toUpperCase() + vehicle.fuelType.slice(1) : '-'} 
                variant="outlined" 
                size="small"
              />
            </Box>
          </Box>
        </Box>
        <Box>
          <Button 
            variant="outlined" 
            onClick={onEdit}
            sx={{ mr: 1 }}
          >
            Modifier
          </Button>
          <Button 
            variant="outlined" 
            color="inherit"
            onClick={onClose}
          >
            Fermer
          </Button>
        </Box>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="body2" color="text.secondary">Kilométrage</Typography>
          <Typography variant="body1" fontWeight="bold">{vehicle.mileage} km</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="body2" color="text.secondary">Date d'achat</Typography>
          <Typography variant="body1" fontWeight="bold">{new Date(vehicle.purchaseDate).toLocaleDateString()}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="body2" color="text.secondary">Dernière maintenance</Typography>
          <Typography variant="body1" fontWeight="bold">
            {lastMaintenanceDate ? new Date(lastMaintenanceDate).toLocaleDateString() : 'Non disponible'}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="body2" color="text.secondary">Prochaine maintenance</Typography>
          <Typography variant="body1" fontWeight="bold">
            {nextDueDate ? new Date(nextDueDate).toLocaleDateString() : 'Non planifiée'}
          </Typography>
        </Grid>
      </Grid>
      
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<CarIcon />} label="Général" iconPosition="start" />
            <Tab icon={<DocumentIcon />} label="Documents" iconPosition="start" />
            <Tab icon={<InspectionIcon />} label="Inspections" iconPosition="start" />
            <Tab icon={<BuildIcon />} label="Maintenance" iconPosition="start" />
            <Tab icon={<InsuranceIcon />} label="Assurance" iconPosition="start" />
            <Tab icon={<SpecificationsIcon />} label="Spécifications" iconPosition="start" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Informations générales</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Détails du véhicule</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Marque</Typography>
                      <Typography variant="body1">{vehicle.brand}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Modèle</Typography>
                      <Typography variant="body1">{vehicle.model}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Immatriculation</Typography>
                      <Typography variant="body1">{vehicle.registrationNumber}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Type</Typography>
                      <Typography variant="body1">{vehicle.type ? vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1) : '-'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Carburant</Typography>
                      <Typography variant="body1">{vehicle.fuelType ? vehicle.fuelType.charAt(0).toUpperCase() + vehicle.fuelType.slice(1) : '-'}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>État et maintenance</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Statut</Typography>
                      <Box>
                        <Chip 
                          icon={getStatusIcon(vehicle.status)}
                          label={vehicle.status} 
                          color={getStatusColor(vehicle.status) as any} 
                          size="small"
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Kilométrage</Typography>
                      <Typography variant="body1">{vehicle.mileage} km</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Date d'achat</Typography>
                      <Typography variant="body1">{new Date(vehicle.purchaseDate).toLocaleDateString()}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Dernière maintenance</Typography>
                      <Typography variant="body1">
                        {lastMaintenanceDate ? new Date(lastMaintenanceDate).toLocaleDateString() : 'Non disponible'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <VehicleDocuments vehicle={vehicle} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <VehicleInspections vehicle={vehicle} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <VehicleMaintenance vehicle={vehicle} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={4}>
          <VehicleInsurance vehicle={vehicle} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={5}>
          <VehicleSpecifications vehicle={vehicle} />
        </TabPanel>
      </Box>
    </Paper>
  );
};

export default VehicleDetailsPanel; 
