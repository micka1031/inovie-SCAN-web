import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, Button, CircularProgress } from '@mui/material';
import { Autorenew } from '@mui/icons-material';
import { Site, SiteTournee } from '../../../types/tournees.types';
import { mapService } from '../../../services/mapService';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Résoudre le problème des icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Composant pour ajuster la vue aux marqueurs
const FitBounds = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds);
    }
  }, [map, positions]);
  
  return null;
};

// Créer une icône personnalisée
const createCustomIcon = (color: string, index: number) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);">${index}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// Obtenir l'ID du site original à partir de l'ID unique
const getOriginalSiteId = (uniqueId: string): string => {
  return uniqueId.includes('_') ? uniqueId.split('_')[0] : uniqueId;
};

interface MapViewProps {
  sites: SiteTournee[];
  allSites: { [key: string]: Site };
  onOptimize: (newOrder: string[]) => void;
}

const MapView: React.FC<MapViewProps> = ({ sites, allSites, onOptimize }) => {
  const [polylinePositions, setPolylinePositions] = useState<[number, number][]>([]);
  const [optimizationLoading, setOptimizationLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Préparer les positions des marqueurs et polylines
  useEffect(() => {
    if (sites.length === 0) return;
    
    const positions: [number, number][] = [];
    
    sites.forEach(siteTournee => {
      const originalId = siteTournee.siteId || getOriginalSiteId(siteTournee.id);
      const site = allSites[originalId];
      if (site && site.latitude && site.longitude) {
        positions.push([site.latitude, site.longitude]);
      }
    });
    
    setPolylinePositions(positions);
    
    // Calculer les infos d'itinéraire si au moins 2 sites
    if (sites.length >= 2) {
      const sitesWithData = sites.map(site => {
        const originalId = site.siteId || getOriginalSiteId(site.id);
        return {
          ...site,
          site: allSites[originalId]
        };
      });
      
      mapService.calculateRoute(sitesWithData)
        .then(route => {
          setRouteInfo(route);
        })
        .catch(err => {
          console.error('Erreur lors du calcul de l\'itinéraire:', err);
          setError("Impossible de calculer l'itinéraire. Certaines coordonnées peuvent être manquantes.");
        });
    }
  }, [sites, allSites]);
  
  // Optimiser la tournée
  const handleOptimizeTour = async () => {
    if (sites.length < 3) return;
    
    setOptimizationLoading(true);
    
    try {
      // Convertir les sites de la tournée en sites standard pour l'optimisation
      const sitesForOptimization: Site[] = sites.map(siteTournee => {
        const originalId = siteTournee.siteId || getOriginalSiteId(siteTournee.id);
        return allSites[originalId];
      });
      
      // Calculer l'ordre optimal
      const optimization = await mapService.optimizeTour(sitesForOptimization);
      
      // Appliquer le nouvel ordre en préservant les IDs uniques des sites
      onOptimize(sites.map((site, index) => site.id));
    } catch (err) {
      console.error('Erreur lors de l\'optimisation de la tournée:', err);
      setError("Impossible d'optimiser l'itinéraire. Veuillez réessayer.");
    } finally {
      setOptimizationLoading(false);
    }
  };
  
  // Calculer la distance et la durée totales
  const routeSummary = React.useMemo(() => {
    if (!routeInfo) return null;
    
    // Calculer la durée totale (en minutes) et la distance totale (en km)
    const totalDuration = Math.round(routeInfo.duration / 60);
    const totalDistance = (routeInfo.distance / 1000).toFixed(1);
    
    return { totalDuration, totalDistance };
  }, [routeInfo]);

  // Centre de la carte par défaut (France)
  const defaultCenter: [number, number] = [46.227638, 2.213749];
  
  if (error) {
    return (
      <Paper sx={{ p: 2, height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Carte de la tournée</Typography>
        <Button
          variant="outlined"
          startIcon={optimizationLoading ? <CircularProgress size={20} /> : <Autorenew />}
          onClick={handleOptimizeTour}
          disabled={optimizationLoading || sites.length < 3}
        >
          Optimiser la tournée
        </Button>
      </Box>
      
      {routeSummary && (
        <Box sx={{ mb: 1, display: 'flex', gap: 2 }}>
          <Typography variant="body2">
            <strong>Distance totale:</strong> {routeSummary.totalDistance} km
          </Typography>
          <Typography variant="body2">
            <strong>Durée estimée:</strong> {routeSummary.totalDuration} min
          </Typography>
        </Box>
      )}
      
      <Box
        sx={{
          height: '450px',
          width: '100%',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        <MapContainer 
          center={polylinePositions.length > 0 ? polylinePositions[0] : defaultCenter}
          zoom={polylinePositions.length > 0 ? 12 : 5}
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
            const originalId = siteTournee.siteId || getOriginalSiteId(siteTournee.id);
            const site = allSites[originalId];
            if (!site || !site.latitude || !site.longitude) return null;
            
            const position: [number, number] = [site.latitude, site.longitude];
            const icon = createCustomIcon(mapService.getMarkerColor(index, sites.length), index + 1);
            
            return (
              <Marker
                key={siteTournee.id}
                position={position}
                icon={icon}
              >
                <Popup>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0' }}>{site.nom}</h4>
                    <p style={{ margin: 0 }}>{site.adresse}<br/>{site.codePostal} {site.ville}</p>
                    <p style={{ margin: '5px 0 0 0', color: '#666' }}>Étape {index + 1}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          
          {polylinePositions.length > 0 && (
            <FitBounds positions={polylinePositions} />
          )}
        </MapContainer>
      </Box>
    </Paper>
  );
};

export default MapView;