import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Button, CircularProgress, Typography, Alert } from '@mui/material';
import OptimizeIcon from '@mui/icons-material/Upgrade';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import { Site, SiteTournee } from '@/types/tournees.types';
import { mapService } from '@/services/mapService';
import './MapView.css';

// Résoudre le problème des icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Composant pour ajuster la vue de la carte
const MapBoundsAdjuster: React.FC<{ coordinates: [number, number][] }> = ({ coordinates }) => {
  const map = useMap();
  
  useEffect(() => {
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates.map(coord => L.latLng(coord[0], coord[1])));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coordinates, map]);
  
  return null;
};

// Icônes personnalisées
const createCustomIcon = (color: string, order?: number) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);">${order !== undefined ? order : ''}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// Types de marqueurs
const START_ICON = createCustomIcon('#4CAF50', 1);
const END_ICON = createCustomIcon('#F44336');
const INTERMEDIATE_ICON = (order: number) => createCustomIcon('#2196F3', order);

interface MapViewProps {
  sites: SiteTournee[];
  allSites: { [key: string]: Site };
  onOptimize: (newOrder: string[]) => void;
}

const MapView: React.FC<MapViewProps> = ({ sites, allSites, onOptimize }) => {
  const [polylinePositions, setPolylinePositions] = useState<[number, number][]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);

  // Trouver le centre de la carte
  const getMapCenter = (): [number, number] => {
    if (sites.length === 0) return [46.603354, 1.888334]; // Centre de la France par défaut

    // Utiliser le premier site comme centre
    const firstSite = allSites[sites[0]?.id];
    if (firstSite) {
      return [firstSite.latitude, firstSite.longitude];
    }

    return [46.603354, 1.888334];
  };

  // Préparer les positions pour les polylines et les marqueurs
  useEffect(() => {
    if (sites.length < 2) {
      setPolylinePositions([]);
      return;
    }

    const positions: [number, number][] = sites.map(siteTournee => {
      const site = allSites[siteTournee.id];
      if (!site) {
        console.error(`Site with id ${siteTournee.id} not found in allSites`);
        return [0, 0]; // Valeur par défaut pour éviter les erreurs
      }
      return [site.latitude, site.longitude];
    });

    setPolylinePositions(positions);
  }, [sites, allSites]);

  // Gérer l'optimisation de la tournée
  const handleOptimize = async () => {
    if (sites.length < 2) {
      setOptimizationError("Il faut au moins 2 sites pour optimiser une tournée.");
      return;
    }

    setIsOptimizing(true);
    setOptimizationError(null);

    try {
      // Extraire les sites complets pour l'optimisation
      const sitesArray = sites.map(siteTournee => {
        return allSites[siteTournee.id];
      }).filter(Boolean) as Site[];

      // Appeler le service d'optimisation
      const optimizationResult = await mapService.optimizeTour(sitesArray);

      // Mettre à jour l'ordre des sites
      onOptimize(optimizationResult.sitesOrder);
    } catch (error) {
      console.error('Erreur lors de l\'optimisation:', error);
      setOptimizationError("Une erreur est survenue lors de l'optimisation de la tournée.");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Carte de la tournée</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<OptimizeIcon />}
          onClick={handleOptimize}
          disabled={isOptimizing || sites.length < 2}
        >
          {isOptimizing ? 'Optimisation...' : 'Optimiser la tournée'}
        </Button>
      </Box>
      
      {optimizationError && (
        <Alert severity="error" sx={{ m: 2 }}>{optimizationError}</Alert>
      )}

      <Box className="map-container" sx={{ flexGrow: 1, position: 'relative' }}>
        {isOptimizing && (
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              zIndex: 1000
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={50} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Optimisation en cours...
              </Typography>
            </Box>
          </Box>
        )}

        <MapContainer
          center={getMapCenter()}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {polylinePositions.length > 0 && (
            <Polyline
              positions={polylinePositions}
              color="#2196F3"
              weight={4}
              opacity={0.7}
            />
          )}
          
          {sites.map((siteTournee, index) => {
            const site = allSites[siteTournee.id];
            if (!site) return null;
            
            let icon;
            if (index === 0) {
              icon = START_ICON;
            } else if (index === sites.length - 1) {
              icon = END_ICON;
            } else {
              icon = INTERMEDIATE_ICON(index + 1);
            }

            return (
              <Marker
                key={siteTournee.id}
                position={[site.latitude, site.longitude]}
                icon={icon}
              >
                {/* On pourrait ajouter un Popup ici pour afficher plus d'informations */}
              </Marker>
            );
          })}
          
          <MapBoundsAdjuster coordinates={polylinePositions} />
        </MapContainer>
      </Box>
    </Paper>
  );
};

export default MapView;