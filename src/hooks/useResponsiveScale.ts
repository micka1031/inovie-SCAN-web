import { useState, useEffect } from 'react';

// Configuration de base pour différents types d'écrans
const SCREEN_CONFIGS = {
  mobile: {
    minWidth: 0,
    maxWidth: 600,
    scale: 0.8,
    fontSize: '14px'
  },
  tablet: {
    minWidth: 601,
    maxWidth: 1024,
    scale: 0.9,
    fontSize: '16px'
  },
  desktop: {
    minWidth: 1025,
    maxWidth: Infinity,
    scale: 1,
    fontSize: '16px'
  }
};

export const useResponsiveScale = () => {
  const [screenConfig, setScreenConfig] = useState(() => {
    const width = window.innerWidth;
    return Object.values(SCREEN_CONFIGS).find(
      config => width >= config.minWidth && width < config.maxWidth
    ) || SCREEN_CONFIGS.desktop;
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const newConfig = Object.values(SCREEN_CONFIGS).find(
        config => width >= config.minWidth && width < config.maxWidth
      ) || SCREEN_CONFIGS.desktop;

      setScreenConfig(newConfig);

      // Ajuster la mise à l'échelle du viewport
      document.documentElement.style.setProperty('--scale', `${newConfig.scale}`);
      document.documentElement.style.setProperty('--base-font-size', newConfig.fontSize);
    };

    // Appliquer initialement
    handleResize();

    // Ajouter l'écouteur de redimensionnement
    window.addEventListener('resize', handleResize);

    // Nettoyer l'écouteur
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    scale: screenConfig.scale,
    fontSize: screenConfig.fontSize
  };
}; 
