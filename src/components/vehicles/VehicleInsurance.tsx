import React, { useState, useEffect } from 'react';
import { Vehicle, InsuranceInfo } from '../../types/Vehicle';
import vehicleService from '../../services/vehicleService';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import {
  Save as SaveIcon,
  HealthAndSafety as InsuranceIcon,
  Description as DescriptionIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

interface VehicleInsuranceProps {
  vehicle: Vehicle;
}

const VehicleInsurance: React.FC<VehicleInsuranceProps> = ({ vehicle }) => {
  const [insuranceInfo, setInsuranceInfo] = useState<InsuranceInfo>(vehicle.insuranceInfo || {
    policyNumber: '',
    provider: '',
    type: '',
    startDate: '',
    endDate: '',
    coverage: '',
    deductible: '',
    premium: '',
    status: 'active',
    documents: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    if (vehicle.insuranceInfo) {
      setInsuranceInfo(vehicle.insuranceInfo);
    }
  }, [vehicle.insuranceInfo]);
  
  const handleInputChange = (field: keyof InsuranceInfo, value: string) => {
    setInsuranceInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      await vehicleService.updateVehicle(vehicle.id, {
        insuranceInfo: insuranceInfo
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde des informations d\'assurance');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'expired':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon />;
      case 'expired':
        return <WarningIcon />;
      case 'pending':
        return <WarningIcon />;
      default:
        return null;
    }
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Informations d'assurance</Typography>
        <Button 
          variant="contained" 
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Enregistrer'}
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Informations d'assurance enregistrées avec succès
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <InsuranceIcon />
              <Typography variant="h6">Détails de la police</Typography>
            </Stack>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Numéro de police"
                  value={insuranceInfo.policyNumber}
                  onChange={(e) => handleInputChange('policyNumber', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Assureur"
                  value={insuranceInfo.provider}
                  onChange={(e) => handleInputChange('provider', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Type d'assurance"
                  value={insuranceInfo.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Statut"
                  value={insuranceInfo.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  InputProps={{
                    startAdornment: getStatusIcon(insuranceInfo.status),
                    endAdornment: (
                      <Chip
                        label={insuranceInfo.status}
                        color={getStatusColor(insuranceInfo.status)}
                        size="small"
                      />
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <CalendarIcon />
              <Typography variant="h6">Dates de couverture</Typography>
            </Stack>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date de début"
                  type="date"
                  value={insuranceInfo.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date de fin"
                  type="date"
                  value={insuranceInfo.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <MoneyIcon />
              <Typography variant="h6">Détails financiers</Typography>
            </Stack>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Couverture"
                  value={insuranceInfo.coverage}
                  onChange={(e) => handleInputChange('coverage', e.target.value)}
                  InputProps={{
                    endAdornment: <Chip label="€" size="small" />
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Franchise"
                  value={insuranceInfo.deductible}
                  onChange={(e) => handleInputChange('deductible', e.target.value)}
                  InputProps={{
                    endAdornment: <Chip label="€" size="small" />
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Prime"
                  value={insuranceInfo.premium}
                  onChange={(e) => handleInputChange('premium', e.target.value)}
                  InputProps={{
                    endAdornment: <Chip label="€" size="small" />
                  }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <DescriptionIcon />
              <Typography variant="h6">Documents d'assurance</Typography>
            </Stack>
            
            {insuranceInfo.documents && insuranceInfo.documents.length > 0 ? (
              <Grid container spacing={2}>
                {insuranceInfo.documents.map((doc, index) => (
                  <Grid item xs={12} key={index}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionIcon />
                      <Typography>{doc.title}</Typography>
                      <Chip
                        label={doc.status}
                        color={doc.status === 'valid' ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography color="text.secondary">
                Aucun document d'assurance disponible
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VehicleInsurance; 
