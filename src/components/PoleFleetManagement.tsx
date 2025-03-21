import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper, Typography } from '@mui/material';
import { 
  DirectionsCar as CarIcon, 
  LocationOn as LocationIcon 
} from '@mui/icons-material';
import PoleManagement from './PoleManagement';
import FleetManagement from './FleetManagement';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Composant pour afficher le contenu d'un onglet
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`polesfleet-tabpanel-${index}`}
      aria-labelledby={`polesfleet-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Fonction pour générer les propriétés d'accessibilité des onglets
const a11yProps = (index: number) => {
  return {
    id: `polesfleet-tab-${index}`,
    'aria-controls': `polesfleet-tabpanel-${index}`,
  };
};

/**
 * Composant combiné pour la gestion des pôles et de la flotte
 */
const PoleFleetManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  // Gérer le changement d'onglet
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Gestion des pôles et de la flotte
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              minHeight: 64,
              fontSize: '0.9rem'
            }
          }}
        >
          <Tab 
            icon={<LocationIcon />} 
            iconPosition="start"
            label="Pôles" 
            {...a11yProps(0)}
          />
          <Tab 
            icon={<CarIcon />} 
            iconPosition="start"
            label="Flotte de véhicules" 
            {...a11yProps(1)}
          />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <PoleManagement />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <FleetManagement />
      </TabPanel>
    </Box>
  );
};

export default PoleFleetManagement; 
