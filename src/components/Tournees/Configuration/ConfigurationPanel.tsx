import React, { useState, useEffect } from 'react';
import { 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Button, 
  Box, 
  Paper, 
  Typography,
  Stack
} from '@mui/material';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import fr from 'date-fns/locale/fr';
import './ConfigurationPanel.css';

interface ConfigurationPanelProps {
  nom: string;
  setNom: (value: string) => void;
  pole: string;
  setPole: (value: string) => void;
  heureDebut: Date;
  setHeureDebut: (value: Date) => void;
  heureFin: Date;
  setHeureFin: (value: Date) => void;
  poles: { id: string; nom: string }[];
  onNext: () => void;
  onSave?: () => void;
  onSaveOnly?: () => void;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  nom,
  setNom,
  pole,
  setPole,
  heureDebut,
  setHeureDebut,
  heureFin,
  setHeureFin,
  poles,
  onNext,
  onSave,
  onSaveOnly
}) => {
  const isFormValid = nom.trim() !== '' && pole !== '';
  const [hasChanges, setHasChanges] = useState(false);
  const [initialValues, setInitialValues] = useState({
    nom,
    pole,
    heureDebut,
    heureFin
  });

  useEffect(() => {
    // Set initial values on first render
    setInitialValues({
      nom,
      pole,
      heureDebut,
      heureFin
    });
  }, []);

  useEffect(() => {
    // Check if current values are different from initial values
    if (nom !== initialValues.nom || 
        pole !== initialValues.pole ||
        heureDebut.getTime() !== initialValues.heureDebut.getTime() ||
        heureFin.getTime() !== initialValues.heureFin.getTime()) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [nom, pole, heureDebut, heureFin, initialValues]);

  const handleSave = () => {
    // Update initial values after saving
    setInitialValues({
      nom,
      pole,
      heureDebut,
      heureFin
    });
    setHasChanges(false);
    
    // Save the data using onSaveOnly (which doesn't navigate) if provided
    // otherwise use standard onSave function that may navigate
    if (onSaveOnly) {
      onSaveOnly();
    } else if (onSave) {
      onSave();
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Configuration de la tournée
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
        <TextField
          label="Nom de la tournée"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          fullWidth
          required
          error={nom.trim() === ''}
          helperText={nom.trim() === '' ? 'Le nom est obligatoire' : ''}
          sx={{
            '& .MuiFormLabel-root': {
              background: 'white',
              padding: '0 4px',
            },
            '& .MuiFormHelperText-root': {
              marginLeft: 0,
              position: 'relative',
              top: '-2px'
            }
          }}
          placeholder="Saisissez le nom de la tournée"
        />
        
        <FormControl fullWidth required error={pole === ''} sx={{
          '& .MuiFormLabel-root': {
            background: 'white',
            padding: '0 4px',
          }
        }}>
          <InputLabel id="pole-select-label">Pôle</InputLabel>
          <Select
            labelId="pole-select-label"
            value={pole}
            label="Pôle"
            onChange={(e) => setPole(e.target.value)}
            displayEmpty
          >
            <MenuItem value="" disabled>
              <em>Sélectionnez un pôle</em>
            </MenuItem>
            {poles.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.nom}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
          <TimePicker
            label="Heure de début"
            value={heureDebut}
            onChange={(newValue) => newValue && setHeureDebut(newValue)}
            slotProps={{
              textField: {
                fullWidth: true,
                sx: {
                  '& .MuiFormLabel-root': {
                    background: 'white',
                    padding: '0 4px',
                  }
                },
                placeholder: "Sélectionnez l'heure de début"
              }
            }}
          />
          
          <TimePicker
            label="Heure de fin"
            value={heureFin}
            onChange={(newValue) => newValue && setHeureFin(newValue)}
            slotProps={{
              textField: {
                fullWidth: true,
                sx: {
                  '& .MuiFormLabel-root': {
                    background: 'white',
                    padding: '0 4px',
                  }
                },
                placeholder: "Sélectionnez l'heure de fin"
              }
            }}
          />
        </Box>
      </LocalizationProvider>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="contained"
          disabled={!isFormValid}
          onClick={handleSave}
          color={hasChanges ? "success" : "primary"}
        >
          Enregistrer
        </Button>
      </Box>
    </Paper>
  );
};

export default ConfigurationPanel;