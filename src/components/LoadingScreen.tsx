import React from 'react';
import { Box, CircularProgress, Typography, Container } from '@mui/material';

const LoadingScreen: React.FC = () => {
  return (
    <Container 
      maxWidth="xs" 
      sx={{
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh'
      }}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          Chargement de l'application...
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Veuillez patienter
        </Typography>
      </Box>
    </Container>
  );
};

export default LoadingScreen; 
