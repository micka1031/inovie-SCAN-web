import React from 'react';
import { Box, Theme } from '@mui/material';

interface MarkerIconProps {
  number: number;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | string;
  size?: number;
}

const MarkerIcon: React.FC<MarkerIconProps> = ({ 
  number, 
  color = 'primary',
  size = 24 
}) => {
  // Convertir les couleurs sémantiques en couleurs réelles
  const getColor = (color: string, theme: Theme) => {
    switch (color) {
      case 'primary': return theme.palette.primary.main;
      case 'secondary': return theme.palette.secondary.main;
      case 'error': return theme.palette.error.main;
      case 'warning': return theme.palette.warning.main;
      case 'info': return theme.palette.info.main;
      case 'success': return theme.palette.success.main;
      default: return color; // Utiliser directement si c'est une couleur personnalisée
    }
  };

  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: getColor(color, theme),
        color: '#fff',
        fontWeight: 'bold',
        fontSize: size * 0.5,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      })}
    >
      {number}
    </Box>
  );
};

export default MarkerIcon; 