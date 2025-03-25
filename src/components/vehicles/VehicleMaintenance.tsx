import React, { useState, useEffect } from 'react';
import { Vehicle, MaintenanceRecord } from '../../types/Vehicle';
import vehicleService from '../../services/vehicleService';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Build as BuildIcon,
  DirectionsCar as CarIcon,
  OilBarrel as OilIcon,
  TireRepair as TireIcon,
  BatteryChargingFull as BatteryIcon,
  LocalGasStation as GasIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

interface VehicleMaintenanceProps {
  vehicle: Vehicle;
}

const VehicleMaintenance: React.FC<VehicleMaintenanceProps> = ({ vehicle }) => {
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [formData, setFormData] = useState<Partial<MaintenanceRecord>>({
    date: new Date().toISOString().split('T')[0],
    type: 'routine',
    description: '',
    mileage: vehicle.odometer,
    cost: 0,
    provider: '',
    nextDueDate: '',
    notes: '',
  });
  
  useEffect(() => {
    loadMaintenanceRecords();
  }, [vehicle.id]);
  
  const loadMaintenanceRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const records = await vehicleService.getMaintenanceRecords(vehicle.id);
      setMaintenanceRecords(records);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des records de maintenance');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenDialog = (record?: MaintenanceRecord) => {
    if (record) {
      setSelectedRecord(record);
      setFormData(record);
    } else {
      setSelectedRecord(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'routine',
        description: '',
        mileage: vehicle.odometer,
        cost: 0,
        provider: '',
        nextDueDate: '',
        notes: '',
      });
    }
    setShowDialog(true);
  };
  
  const handleCloseDialog = () => {
    setShowDialog(false);
    setSelectedRecord(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'routine',
      description: '',
      mileage: vehicle.odometer,
      cost: 0,
      provider: '',
      nextDueDate: '',
      notes: '',
    });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async () => {
    try {
      if (selectedRecord) {
        await vehicleService.updateMaintenanceRecord(vehicle.id, selectedRecord.id, formData as MaintenanceRecord);
      } else {
        await vehicleService.addMaintenanceRecord(vehicle.id, formData as MaintenanceRecord);
      }
      handleCloseDialog();
      loadMaintenanceRecords();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde du record de maintenance');
      console.error('Erreur:', err);
    }
  };
  
  const handleDelete = async (recordId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce record de maintenance ?')) {
      try {
        await vehicleService.deleteMaintenanceRecord(vehicle.id, recordId);
        loadMaintenanceRecords();
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la suppression du record de maintenance');
        console.error('Erreur:', err);
      }
    }
  };
  
  const getMaintenanceTypeIcon = (type: string) => {
    switch (type) {
      case 'routine':
        return <BuildIcon />;
      case 'repair':
        return <CarIcon />;
      case 'oil':
        return <OilIcon />;
      case 'tire':
        return <TireIcon />;
      case 'battery':
        return <BatteryIcon />;
      case 'fuel':
        return <GasIcon />;
      default:
        return <BuildIcon />;
    }
  };
  
  const getMaintenanceTypeLabel = (type: string) => {
    switch (type) {
      case 'routine':
        return 'Maintenance routinière';
      case 'repair':
        return 'Réparation';
      case 'oil':
        return 'Vidange';
      case 'tire':
        return 'Pneus';
      case 'battery':
        return 'Batterie';
      case 'fuel':
        return 'Carburant';
      default:
        return type;
    }
  };
  
  const getNextDueStatus = (nextDueDate: string) => {
    if (!nextDueDate) return null;
    
    const dueDate = new Date(nextDueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      return { color: 'error', label: 'En retard' };
    } else if (daysUntilDue <= 7) {
      return { color: 'warning', label: 'Bientôt dû' };
    } else {
      return { color: 'success', label: 'À jour' };
    }
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Maintenance du véhicule</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nouveau record
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}
      
      {maintenanceRecords.length === 0 ? (
        <Alert severity="info">
          Aucun record de maintenance pour ce véhicule. Utilisez le bouton "Nouveau record" pour ajouter un record.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Kilométrage</TableCell>
                <TableCell>Coût</TableCell>
                <TableCell>Prochain rendez-vous</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {maintenanceRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {getMaintenanceTypeIcon(record.type)}
                      <Typography variant="body2">
                        {getMaintenanceTypeLabel(record.type)}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{record.description}</TableCell>
                  <TableCell>{record.mileage.toLocaleString()} km</TableCell>
                  <TableCell>{record.cost.toFixed(2)} €</TableCell>
                  <TableCell>
                    {record.nextDueDate && (
                      <Chip 
                        label={new Date(record.nextDueDate).toLocaleDateString()}
                        color={getNextDueStatus(record.nextDueDate)?.color as any}
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small"
                      onClick={() => handleOpenDialog(record)}
                      title="Éditer"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small"
                      onClick={() => handleDelete(record.id)}
                      title="Supprimer"
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Dialog d'ajout/modification */}
      <Dialog 
        open={showDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedRecord ? 'Modifier le record de maintenance' : 'Nouveau record de maintenance'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                select
                SelectProps={{ native: true }}
              >
                <option value="routine">Maintenance routinière</option>
                <option value="repair">Réparation</option>
                <option value="oil">Vidange</option>
                <option value="tire">Pneus</option>
                <option value="battery">Batterie</option>
                <option value="fuel">Carburant</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Kilométrage"
                name="mileage"
                type="number"
                value={formData.mileage}
                onChange={handleInputChange}
                InputProps={{ endAdornment: 'km' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Coût"
                name="cost"
                type="number"
                value={formData.cost}
                onChange={handleInputChange}
                InputProps={{ endAdornment: '€' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Prestataire"
                name="provider"
                value={formData.provider}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Prochain rendez-vous"
                type="date"
                name="nextDueDate"
                value={formData.nextDueDate}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedRecord ? 'Modifier' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Résumé de la maintenance */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Résumé de la maintenance
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Dernière maintenance
              </Typography>
              {maintenanceRecords.length > 0 ? (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Date: {new Date(maintenanceRecords[0].date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Type: {getMaintenanceTypeLabel(maintenanceRecords[0].type)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Kilométrage: {maintenanceRecords[0].mileage.toLocaleString()} km
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucune maintenance enregistrée
                </Typography>
              )}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Prochain rendez-vous
              </Typography>
              {maintenanceRecords.some(record => record.nextDueDate) ? (
                <List dense>
                  {maintenanceRecords
                    .filter(record => record.nextDueDate)
                    .sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime())
                    .slice(0, 3)
                    .map(record => {
                      const status = getNextDueStatus(record.nextDueDate!);
                      return (
                        <ListItem key={record.id}>
                          <ListItemIcon>
                            {status?.color === 'error' ? <ErrorIcon color="error" /> :
                             status?.color === 'warning' ? <WarningIcon color="warning" /> :
                             <CheckCircleIcon color="success" />}
                          </ListItemIcon>
                          <ListItemText 
                            primary={getMaintenanceTypeLabel(record.type)}
                            secondary={`${new Date(record.nextDueDate!).toLocaleDateString()} (${status?.label})`}
                          />
                        </ListItem>
                      );
                    })}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucun rendez-vous prévu
                </Typography>
              )}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Coûts de maintenance
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total: {maintenanceRecords.reduce((sum, record) => sum + record.cost, 0).toFixed(2)} €
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Moyenne par maintenance: {(maintenanceRecords.reduce((sum, record) => sum + record.cost, 0) / Math.max(1, maintenanceRecords.length)).toFixed(2)} €
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default VehicleMaintenance; 
