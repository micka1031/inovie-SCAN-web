import React, { useState, useEffect } from 'react';
import { Vehicle, TechnicalSpecifications } from '../../types/Vehicle';
import vehicleService from '../../services/vehicleService';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Straighten as StraightenIcon,
  Speed as SpeedIcon,
  TireRepair as TireRepairIcon,
  Wash as WashIcon,
  BatteryChargingFull as BatteryIcon,
} from '@mui/icons-material';

interface VehicleSpecificationsProps {
  vehicle: Vehicle;
}

const VehicleSpecifications: React.FC<VehicleSpecificationsProps> = ({ vehicle }) => {
  const [specifications, setSpecifications] = useState<TechnicalSpecifications | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setSpecifications(vehicle.technicalSpecifications);
  }, [vehicle]);

  const handleInputChange = (
    section: keyof TechnicalSpecifications,
    field: string,
    value: string | number,
    nestedField?: string
  ) => {
    if (!specifications) return;

    setSpecifications((prev) => {
      if (!prev) return null;

      if (nestedField) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: {
              ...prev[section][field],
              [nestedField]: value,
            },
          },
        };
      }

      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!specifications) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await vehicleService.updateTechnicalSpecifications(vehicle.id, specifications);
      setSuccess('Spécifications techniques mises à jour avec succès');
    } catch (err) {
      setError('Erreur lors de la mise à jour des spécifications techniques');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (
    section: keyof TechnicalSpecifications,
    title: string,
    icon: React.ReactNode,
    fields: { 
      key: string; 
      label: string; 
      nested?: boolean; 
      nestedKey?: string;
      type?: 'text' | 'number';
    }[]
  ) => {
    if (!specifications) return null;

    return (
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {icon}
            <Typography variant="h6" sx={{ ml: 1 }}>{title}</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {fields.map((field) => (
              <Grid item xs={12} sm={6} md={4} key={field.key + (field.nestedKey || '')}>
                <TextField
                  fullWidth
                  label={field.label}
                  variant="outlined"
                  size="small"
                  type={field.type || 'text'}
                  value={
                    field.nested && field.nestedKey
                      ? specifications[section][field.key][field.nestedKey]
                      : specifications[section][field.key]
                  }
                  onChange={(e) => 
                    handleInputChange(
                      section, 
                      field.key, 
                      field.type === 'number' ? parseFloat(e.target.value) : e.target.value,
                      field.nested ? field.nestedKey : undefined
                    )
                  }
                />
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
    );
  };

  if (!specifications) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1">Aucune spécification technique disponible pour ce véhicule.</Typography>
        <Button 
          variant="contained" 
          sx={{ mt: 2 }}
          onClick={() => {
            const defaultSpecs: TechnicalSpecifications = {
              engine: {
                type: '',
                displacement: '',
                power: '',
                torque: '',
                cylinders: 0,
                fuelSystem: '',
                transmission: '',
              },
              dimensions: {
                length: '',
                width: '',
                height: '',
                wheelbase: '',
                groundClearance: '',
                cargoVolume: '',
              },
              performance: {
                acceleration: '',
                topSpeed: '',
                brakingDistance: '',
                fuelConsumption: '',
                range: '',
              },
              tires: {
                front: '',
                rear: '',
                spare: '',
                pressure: {
                  front: '',
                  rear: '',
                  spare: '',
                },
              },
              fluids: {
                engineOil: {
                  type: '',
                  capacity: '',
                  changeInterval: '',
                },
                coolant: {
                  type: '',
                  capacity: '',
                  changeInterval: '',
                },
                transmission: {
                  type: '',
                  capacity: '',
                  changeInterval: '',
                },
                brake: {
                  type: '',
                  capacity: '',
                  changeInterval: '',
                },
              },
              electrical: {
                battery: {
                  type: '',
                  voltage: '',
                  capacity: '',
                  location: '',
                },
                alternator: {
                  output: '',
                  type: '',
                },
              },
            };
            setSpecifications(defaultSpecs);
          }}
        >
          Ajouter des spécifications
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Spécifications techniques</Typography>
        <Button 
          variant="contained" 
          color="primary"
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
          {success}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        {renderSection(
          'engine',
          'Moteur',
          <SettingsIcon color="primary" />,
          [
            { key: 'type', label: 'Type de moteur' },
            { key: 'displacement', label: 'Cylindrée' },
            { key: 'power', label: 'Puissance' },
            { key: 'torque', label: 'Couple' },
            { key: 'cylinders', label: 'Nombre de cylindres', type: 'number' },
            { key: 'fuelSystem', label: 'Système d\'alimentation' },
            { key: 'transmission', label: 'Transmission' },
          ]
        )}

        {renderSection(
          'dimensions',
          'Dimensions',
          <StraightenIcon color="primary" />,
          [
            { key: 'length', label: 'Longueur' },
            { key: 'width', label: 'Largeur' },
            { key: 'height', label: 'Hauteur' },
            { key: 'wheelbase', label: 'Empattement' },
            { key: 'groundClearance', label: 'Garde au sol' },
            { key: 'cargoVolume', label: 'Volume de chargement' },
          ]
        )}

        {renderSection(
          'performance',
          'Performance',
          <SpeedIcon color="primary" />,
          [
            { key: 'acceleration', label: '0-100 km/h' },
            { key: 'topSpeed', label: 'Vitesse max' },
            { key: 'brakingDistance', label: 'Distance de freinage' },
            { key: 'fuelConsumption', label: 'Consommation' },
            { key: 'range', label: 'Autonomie' },
          ]
        )}

        {renderSection(
          'tires',
          'Pneumatiques',
          <TireRepairIcon color="primary" />,
          [
            { key: 'front', label: 'Avant' },
            { key: 'rear', label: 'Arrière' },
            { key: 'spare', label: 'Roue de secours' },
            { key: 'pressure', label: 'Pression avant', nested: true, nestedKey: 'front' },
            { key: 'pressure', label: 'Pression arrière', nested: true, nestedKey: 'rear' },
            { key: 'pressure', label: 'Pression roue de secours', nested: true, nestedKey: 'spare' },
          ]
        )}

        {renderSection(
          'fluids',
          'Fluides',
          <WashIcon color="primary" />,
          [
            { key: 'engineOil', label: 'Type d\'huile moteur', nested: true, nestedKey: 'type' },
            { key: 'engineOil', label: 'Capacité d\'huile', nested: true, nestedKey: 'capacity' },
            { key: 'engineOil', label: 'Intervalle de vidange', nested: true, nestedKey: 'changeInterval' },
            { key: 'coolant', label: 'Type de liquide de refroidissement', nested: true, nestedKey: 'type' },
            { key: 'coolant', label: 'Capacité du liquide de refroidissement', nested: true, nestedKey: 'capacity' },
            { key: 'coolant', label: 'Intervalle de changement', nested: true, nestedKey: 'changeInterval' },
            { key: 'transmission', label: 'Type d\'huile de transmission', nested: true, nestedKey: 'type' },
            { key: 'transmission', label: 'Capacité de transmission', nested: true, nestedKey: 'capacity' },
            { key: 'transmission', label: 'Intervalle de changement', nested: true, nestedKey: 'changeInterval' },
            { key: 'brake', label: 'Type de liquide de frein', nested: true, nestedKey: 'type' },
            { key: 'brake', label: 'Capacité de liquide de frein', nested: true, nestedKey: 'capacity' },
            { key: 'brake', label: 'Intervalle de changement', nested: true, nestedKey: 'changeInterval' },
          ]
        )}

        {renderSection(
          'electrical',
          'Système électrique',
          <BatteryIcon color="primary" />,
          [
            { key: 'battery', label: 'Type de batterie', nested: true, nestedKey: 'type' },
            { key: 'battery', label: 'Tension', nested: true, nestedKey: 'voltage' },
            { key: 'battery', label: 'Capacité', nested: true, nestedKey: 'capacity' },
            { key: 'battery', label: 'Emplacement', nested: true, nestedKey: 'location' },
            { key: 'alternator', label: 'Puissance de l\'alternateur', nested: true, nestedKey: 'output' },
            { key: 'alternator', label: 'Type d\'alternateur', nested: true, nestedKey: 'type' },
          ]
        )}
      </Box>
    </Box>
  );
};

export default VehicleSpecifications; 
