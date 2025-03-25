import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import VehicleManagementPanel from '../components/vehicles/VehicleManagementPanel';

const VehicleManagement: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestion de la flotte
        </Typography>
        <VehicleManagementPanel />
      </Box>
    </Container>
  );
};

export default VehicleManagement; 
