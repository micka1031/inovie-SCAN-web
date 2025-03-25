import React from 'react';
import { 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Button, 
  Box, 
  Paper, 
  Typography
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
  onNext
}) => {
  const isFormValid = nom.trim() !== '' && pole !== '';

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
        />
        
        <FormControl fullWidth required error={pole === ''}>
          <InputLabel id="pole-select-label">Pôle</InputLabel>
          <Select
            labelId="pole-select-label"
            value={pole}
            label="Pôle"
            onChange={(e) => setPole(e.target.value)}
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
                fullWidth: true
              }
            }}
          />
          
          <TimePicker
            label="Heure de fin"
            value={heureFin}
            onChange={(newValue) => newValue && setHeureFin(newValue)}
            slotProps={{
              textField: {
                fullWidth: true
              }
            }}
          />
        </Box>
      </LocalizationProvider>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          disabled={!isFormValid}
          onClick={onNext}
        >
          Continuer
        </Button>
      </Box>
    </Paper>
  );
};

export default ConfigurationPanel;