import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Paper, Typography, Button, CircularProgress } from '@mui/material';
import { Autorenew } from '@mui/icons-material';
import { SiteTournee, Site } from '../../../types/tournees.types';
import { mapService } from '../../../services/mapService';
import './MapView.css';

// Obtenir l'ID du site original à partir de l'ID unique
const getOriginalSiteId = (uniqueId: string): string => {
  return uniqueId.includes('_') ? uniqueId.split('_')[0] : uniqueId;
};

interface MapViewProps {
  sites: SiteTournee[];
  allSites: { [key: string]: Site };
  onOptimize: (newOrder: string[]) => void;
}

// Interface pour un marqueur Google Maps
interface GoogleMapMarker {
  marker: google.maps.Marker;
  siteIndex: number;
  siteTournee: SiteTournee;
}

const MapView: React.FC<MapViewProps> = ({ sites, allSites, onOptimize }) => {
  const [optimizationLoading, setOptimizationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeSummary, setRouteSummary] = useState<{ totalDistance: string; totalDuration: number } | null>(null);
  
  // Référence à la carte Google Maps
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  
  // Référence aux marqueurs et polylines pour pouvoir les supprimer
  const markersRef = useRef<GoogleMapMarker[]>([]);
  const directionsRenderersRef = useRef<google.maps.DirectionsRenderer[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  
  // Chargement de l'API Google Maps et initialisation de la carte
  useEffect(() => {
    // Fonction pour charger l'API Google Maps
    const loadGoogleMapsAPI = () => {
      if (window.google && window.google.maps) {
        console.log("API Google Maps déjà chargée");
        console.log("Bibliothèques Google Maps disponibles:", 
          window.google.maps ? Object.keys(window.google.maps).join(', ') : 'Non disponibles');
        console.log("Bibliothèque geometry disponible:", 
          !!window.google.maps.geometry);
        console.log("DirectionsService disponible:", 
          !!window.google.maps.DirectionsService);
        initializeMap();
        return;
      }
      
      console.log("Chargement de l'API Google Maps...");
      
      // Créer un script pour charger l'API Google Maps
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places,geometry&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log("API Google Maps chargée avec succès");
        console.log("Bibliothèques Google Maps disponibles:", 
          window.google.maps ? Object.keys(window.google.maps).join(', ') : 'Non disponibles');
        console.log("Bibliothèque geometry disponible:", 
          !!window.google.maps.geometry);
        console.log("DirectionsService disponible:", 
          !!window.google.maps.DirectionsService);
        initializeMap();
      };
      script.onerror = () => {
        console.error("Erreur lors du chargement de l'API Google Maps");
        setError("Impossible de charger Google Maps. Veuillez réessayer ultérieurement.");
      };
      
      document.head.appendChild(script);
    };
    
    // Fonction pour initialiser la carte
    const initializeMap = () => {
      if (!mapContainerRef.current || !window.google || !window.google.maps) return;
      
      console.log("Initialisation de la carte Google Maps");
      
      // Déterminer le centre de la carte
      let mapCenter = { lat: 46.227638, lng: 2.213749 }; // France par défaut
      
      if (sites.length > 0) {
        // Utiliser le premier site comme centre si disponible
        for (const site of sites) {
          const originalId = site.siteId || getOriginalSiteId(site.id);
          const siteData = allSites[originalId];
          
          if (siteData && siteData.latitude && siteData.longitude) {
            mapCenter = { lat: siteData.latitude, lng: siteData.longitude };
            break;
          }
        }
      }
      
      // Créer la carte
      const map = new google.maps.Map(mapContainerRef.current, {
        center: mapCenter,
        zoom: 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: google.maps.ControlPosition.TOP_LEFT,
          mapTypeIds: [
            google.maps.MapTypeId.ROADMAP,
            google.maps.MapTypeId.SATELLITE,
            google.maps.MapTypeId.HYBRID,
            google.maps.MapTypeId.TERRAIN
          ]
        },
        styles: [
          {
            "featureType": "all",
            "elementType": "geometry",
            "stylers": [{ "visibility": "simplified" }]
          },
          {
            "featureType": "road",
            "elementType": "geometry.fill",
            "stylers": [
              { "lightness": 80 },
              { "color": "#e8e8e8" }
            ]
          },
          {
            "featureType": "road",
            "elementType": "geometry.stroke",
            "stylers": [
              { "visibility": "simplified" },
              { "lightness": 100 },
              { "color": "#f5f5f5" }
            ]
          },
          {
            "featureType": "transit.line",
            "stylers": [{ "visibility": "off" }]
          }
        ],
        streetViewControl: false,
        fullscreenControl: true,
      });
      
      // Créer un bouton pour changer le style de la carte
      const styleControlDiv = document.createElement('div');
      
      // Créer le contrôle personnalisé
      const controlUI = document.createElement('div');
      controlUI.style.backgroundColor = '#fff';
      controlUI.style.border = '2px solid #fff';
      controlUI.style.borderRadius = '3px';
      controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
      controlUI.style.cursor = 'pointer';
      controlUI.style.marginTop = '10px';
      controlUI.style.marginLeft = '10px';
      controlUI.style.marginRight = '10px';
      controlUI.style.textAlign = 'center';
      controlUI.title = 'Cliquez pour changer le style de la carte';
      styleControlDiv.appendChild(controlUI);
      
      // Créer le texte du contrôle
      const controlText = document.createElement('div');
      controlText.style.color = 'rgb(25,25,25)';
      controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
      controlText.style.fontSize = '16px';
      controlText.style.lineHeight = '38px';
      controlText.style.paddingLeft = '5px';
      controlText.style.paddingRight = '5px';
      controlText.innerHTML = 'Changer Style';
      controlUI.appendChild(controlText);
      
      // Configuration des styles alternatifs
      const mapStyles = [
        { name: 'Bleu', styles: [
          { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#cfe2f3" }] },
          { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#aaccee" }] }
        ]},
        { name: 'Standard', styles: map.get('styles') }, // Style actuel
        { name: 'Clair', styles: [
          { "featureType": "all", "elementType": "all", "stylers": [{ "lightness": 50 }] },
          { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#f5f5f5" }] }
        ]},
        { name: 'Sombre', styles: [
          { "featureType": "all", "elementType": "all", "stylers": [{"lightness": -30}] },
          { "featureType": "road", "elementType": "geometry", "stylers": [{"lightness": 10}, {"color": "#444444"}] }
        ]},
        { name: 'Neutre', styles: [] } // Style par défaut de Google Maps
      ];
      
      let currentStyleIndex = 0;
      
      // Appliquer immédiatement le style "Bleu"
      map.setOptions({ styles: mapStyles[currentStyleIndex].styles });
      
      // Ajouter l'événement click pour changer de style
      controlUI.addEventListener('click', () => {
        currentStyleIndex = (currentStyleIndex + 1) % mapStyles.length;
        const newStyle = mapStyles[currentStyleIndex];
        map.setOptions({ styles: newStyle.styles });
        controlText.innerHTML = `Style: ${newStyle.name}`;
      });
      
      // Mettre à jour le texte pour refléter le style initial
      controlText.innerHTML = `Style: ${mapStyles[currentStyleIndex].name}`;
      
      // Ajouter le contrôle personnalisé à la carte
      map.controls[google.maps.ControlPosition.TOP_RIGHT].push(styleControlDiv);
      
      // Activer la couche de trafic
      const trafficLayer = new google.maps.TrafficLayer();
      trafficLayer.setMap(map);
      
      // Stocker la référence à la carte
      googleMapRef.current = map;
      
      // Mettre à jour les marqueurs et les itinéraires
      updateMapElements();
    };
    
    loadGoogleMapsAPI();
  }, []);
  
  // Mettre à jour les éléments de la carte lorsque les sites changent
  useEffect(() => {
    updateMapElements();
  }, [sites]);
  
  // Fonction pour créer les marqueurs et les itinéraires
  const updateMapElements = useCallback(() => {
    if (!googleMapRef.current || !window.google || !window.google.maps) return;
    
    const map = googleMapRef.current;
    
    console.log("Mise à jour des éléments de la carte");
    console.log(`Nombre de sites: ${sites.length}`);
    
    // Nettoyer les marqueurs et polylines existants
    markersRef.current.forEach(({ marker }) => marker.setMap(null));
    directionsRenderersRef.current.forEach(renderer => renderer.setMap(null));
    polylinesRef.current.forEach(polyline => polyline.getPath().clear());
    
    markersRef.current = [];
    directionsRenderersRef.current = [];
    polylinesRef.current = [];
    
    if (sites.length === 0) return;
    
    // Ajouter les marqueurs pour chaque site
    sites.forEach((siteTournee, index) => {
      const originalId = siteTournee.siteId || getOriginalSiteId(siteTournee.id);
      const site = allSites[originalId];
      
      if (!site || !site.latitude || !site.longitude) {
        console.warn(`Site ${originalId} n'a pas de coordonnées valides`);
        return;
      }
      
      const isFirst = index === 0;
      const isLast = index === sites.length - 1;
      
      // Déterminer la couleur du marqueur
      let iconColor = '#1976D2'; // Bleu par défaut
      if (isFirst) iconColor = '#00796B'; // Vert pour le premier
      if (isLast) iconColor = '#D32F2F'; // Rouge pour le dernier
      
      // Créer le marqueur
      const marker = new google.maps.Marker({
        position: { lat: site.latitude, lng: site.longitude },
        map,
        title: site.nom,
        label: {
          text: String(index + 1),
          color: '#FFFFFF',
          fontWeight: 'bold'
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: iconColor,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 12,
          labelOrigin: new google.maps.Point(0, 0)
        },
        zIndex: isFirst || isLast ? 1000 : 100
      });
      
      // Créer l'infowindow pour le marqueur
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h4 style="margin: 0 0 8px 0; color: #1976D2;">${site.nom}</h4>
            <p style="margin: 4px 0;">${site.adresse || ''}</p>
            <p style="margin: 4px 0;">${site.codePostal || ''} ${site.ville || ''}</p>
            <p style="margin: 8px 0 0 0; font-weight: bold;">
              ${isFirst ? 'Départ' : isLast ? 'Arrivée' : `Étape ${index + 1}`}
            </p>
          </div>
        `
      });
      
      // Ajouter l'événement de clic
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
      
      // Ajouter le marqueur à la liste
      markersRef.current.push({
        marker,
        siteIndex: index,
        siteTournee
      });
    });
    
    // Ajouter les itinéraires entre les sites si nous avons au moins 2 sites
    if (sites.length >= 2 && window.google.maps.DirectionsService) {
      const directionsService = new google.maps.DirectionsService();
      
      // Calculer les itinéraires pour chaque segment
      let totalDistance = 0;
      let totalDuration = 0;
      
      // Fonction récursive pour calculer les itinéraires segment par segment
      const calculateRoute = (index: number) => {
        if (index >= sites.length - 1) {
          // Tous les segments ont été calculés
          if (totalDistance > 0 && totalDuration > 0) {
            setRouteSummary({
              totalDistance: (totalDistance / 1000).toFixed(1),
              totalDuration: Math.round(totalDuration / 60)
            });
          }
          return;
        }
        
        // Récupérer les sites source et destination
        const originId = sites[index].siteId || getOriginalSiteId(sites[index].id);
        const destId = sites[index + 1].siteId || getOriginalSiteId(sites[index + 1].id);
        
        const origin = allSites[originId];
        const destination = allSites[destId];
        
        if (!origin || !destination || 
            !origin.latitude || !origin.longitude || 
            !destination.latitude || !destination.longitude) {
          console.warn(`Coordonnées manquantes pour le segment ${index} -> ${index+1}`);
          // Passer au segment suivant
          calculateRoute(index + 1);
          return;
        }
        
        console.log(`Calcul d'itinéraire entre ${origin.nom} et ${destination.nom}`);
        
        // Couleurs pour les segments
        const colors = [
          "#4285F4", // bleu Google
          "#34A853", // vert Google
          "#FBBC05", // jaune Google
          "#EA4335", // rouge Google
          "#8E44AD", // violet
          "#F39C12"  // orange
        ];
        
        // Créer le DirectionsRenderer avec des couleurs qui dépendront du trafic
        const directionsRenderer = new google.maps.DirectionsRenderer({
          map: map,
          suppressMarkers: true, // Ne pas afficher les marqueurs
          preserveViewport: true,
          polylineOptions: {
            strokeColor: colors[index % colors.length], // Couleur par défaut, sera mise à jour avec les infos de trafic
            strokeOpacity: 0.8,
            strokeWeight: 5
          }
        });
        
        // Ajouter à la liste pour le nettoyage
        directionsRenderersRef.current.push(directionsRenderer);
        
        // Préparer la requête
        const request = {
          origin: { lat: origin.latitude, lng: origin.longitude },
          destination: { lat: destination.latitude, lng: destination.longitude },
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC,
          drivingOptions: {
            departureTime: new Date(), // Utiliser l'heure actuelle pour le trafic
            trafficModel: google.maps.TrafficModel.BEST_GUESS
          }
        };
        
        // Calculer l'itinéraire
        directionsService.route(request, (result, status) => {
          console.log(`Status pour segment ${index}:`, status);
          
          if (status === 'OK' && result) {
            // Afficher l'itinéraire
            directionsRenderer.setDirections(result);
            
            // Si les informations de trafic sont disponibles, mettre à jour la couleur en fonction du trafic
            if (result.routes && result.routes.length > 0 && 
                result.routes[0].legs && result.routes[0].legs.length > 0) {
              const leg = result.routes[0].legs[0];
              
              if (leg.duration && leg.duration_in_traffic) {
                const trafficRatio = leg.duration_in_traffic.value / leg.duration.value;
                let trafficColor = '#1976D2'; // Bleu pour fluide (au lieu de vert)
                
                if (trafficRatio > 1.5) {
                  trafficColor = '#F44336'; // Rouge pour congestionné
                } else if (trafficRatio > 1.2) {
                  trafficColor = '#FF9800'; // Orange pour chargé
                }
                
                // Mise à jour de la couleur du polyline en fonction du trafic
                directionsRenderer.setOptions({
                  polylineOptions: {
                    strokeColor: trafficColor,
                    strokeOpacity: 0.9,
                    strokeWeight: 6
                  }
                });
                
                // Réappliquer la direction pour que les nouvelles options prennent effet
                directionsRenderer.setDirections(result);
                
                // Créer une infobulle pour le segment
                const infoWindow = new google.maps.InfoWindow({
                  content: `
                    <div style="padding: 8px;">
                      <h4 style="margin: 0 0 4px 0; color: #1976D2;">Segment ${index + 1}</h4>
                      <p style="margin: 2px 0;"><strong>De:</strong> ${origin.nom}</p>
                      <p style="margin: 2px 0;"><strong>À:</strong> ${destination.nom}</p>
                      <p style="margin: 2px 0;"><strong>Distance:</strong> ${leg.distance.text}</p>
                      <p style="margin: 2px 0;"><strong>Durée:</strong> ${leg.duration.text}</p>
                      <p style="margin: 2px 0; color: ${
                        trafficRatio > 1.5 ? '#F44336' : 
                        trafficRatio > 1.2 ? '#FF9800' : '#1976D2'
                      }">
                        <strong>Trafic:</strong> ${
                          trafficRatio > 1.5 ? 'Congestionné' :
                          trafficRatio > 1.2 ? 'Chargé' : 'Fluide'
                        } (${leg.duration_in_traffic.text})
                      </p>
                      <p style="margin: 2px 0;"><strong>Départ prévu:</strong> ${new Date(sites[index].heureArrivee).toLocaleTimeString()}</p>
                    </div>
                  `
                });
                
                // Ajouter un écouteur d'événement au renderer directement
                if (result.routes[0].overview_path && result.routes[0].overview_path.length > 0) {
                  const path = result.routes[0].overview_path;
                  
                  // Créer un polyline invisible par-dessus pour capter les clics
                  const clickablePath = new google.maps.Polyline({
                    path: path,
                    strokeColor: '#000000',
                    strokeOpacity: 0,
                    strokeWeight: 10, // plus large pour faciliter le clic
                    map: map,
                    clickable: true
                  });
                  
                  // Stocker pour nettoyage ultérieur
                  polylinesRef.current.push(clickablePath);
                  
                  // Ajouter un écouteur d'événement pour le clic
                  google.maps.event.addListener(clickablePath, 'click', (e: any) => {
                    if (e && e.latLng) {
                      infoWindow.setPosition(e.latLng);
                      infoWindow.open(map);
                    }
                  });
                  
                  // Ajouter aussi un mouseover pour améliorer l'UX
                  google.maps.event.addListener(clickablePath, 'mouseover', () => {
                    clickablePath.setOptions({ strokeOpacity: 0.15 });
                  });
                  
                  google.maps.event.addListener(clickablePath, 'mouseout', () => {
                    clickablePath.setOptions({ strokeOpacity: 0 });
                  });
                }
              }
            }
            
            console.log(`Itinéraire calculé avec succès pour le segment ${index + 1}`);
            
            // Vérifier si le polyline est présent
            const route = result.routes[0];
            if (route.overview_path && route.overview_path.length > 0) {
              console.log(`Nombre de points dans le tracé: ${route.overview_path.length}`);
            } else if (route.overview_polyline) {
              // Vérifier si overview_polyline est un objet avec une propriété points
              if (typeof route.overview_polyline === 'object' && route.overview_polyline !== null) {
                const polylineObj = route.overview_polyline as { points?: string };
                console.log(`Polyline encodé disponible, longueur: ${polylineObj.points?.length || 0}`);
              } else {
                console.log(`Polyline disponible mais sous un format non attendu: ${typeof route.overview_polyline}`);
              }
            }
          } else {
            console.error(`Erreur lors du calcul de l'itinéraire pour segment ${index}: ${status}`);
            
            // Tentative alternative avec des paramètres différents
            console.log("Tentative alternative avec des paramètres simplifiés...");
            const simpleRequest = {
              origin: request.origin,
              destination: request.destination,
              travelMode: google.maps.TravelMode.DRIVING,
              unitSystem: google.maps.UnitSystem.METRIC,
              drivingOptions: {
                departureTime: new Date(), // Utiliser l'heure actuelle pour le trafic
                trafficModel: google.maps.TrafficModel.BEST_GUESS
              }
            };
            
            directionsService.route(simpleRequest, (altResult, altStatus) => {
              if (altStatus === 'OK' && altResult) {
                console.log("Itinéraire alternatif trouvé avec succès");
                directionsRenderer.setDirections(altResult);
                
                // Mettre à jour les statistiques
                if (altResult.routes && altResult.routes.length > 0 && 
                    altResult.routes[0].legs && altResult.routes[0].legs.length > 0) {
                  const leg = altResult.routes[0].legs[0];
                  
                  if (leg.distance && leg.duration) {
                    totalDistance += leg.distance.value;
                    totalDuration += leg.duration.value;
                    
                    console.log(`Distance (tentative alternative): ${leg.distance.text}, Durée: ${leg.duration.text}`);
                  }
                }
                
                // Passer au segment suivant
                calculateRoute(index + 1);
              } else {
                console.error(`Échec de la tentative alternative: ${altStatus}`);
                
                // En cas d'échec, créer un tracé direct entre les points
                const directPolyline = new google.maps.Polyline({
                  path: [
                    request.origin,
                    request.destination
                  ],
                  geodesic: true, // Suivre la courbure de la Terre
                  strokeColor: colors[index % colors.length],
                  strokeOpacity: 0.5,
                  strokeWeight: 3,
                  map: map
                });
                
                // Estimer la distance et la durée pour un tracé direct
                const directDistance = google.maps.geometry.spherical.computeDistanceBetween(
                  new google.maps.LatLng(request.origin.lat, request.origin.lng),
                  new google.maps.LatLng(request.destination.lat, request.destination.lng)
                );
                
                // Estimer la durée: environ 50 km/h de moyenne pour une ligne directe
                const estimatedDuration = (directDistance / 1000) * (60 * 60 / 50); // en secondes
                
                // Ajouter aux totaux
                totalDistance += directDistance;
                totalDuration += estimatedDuration;
                
                console.log(`Estimation directe - Distance: ${(directDistance / 1000).toFixed(1)} km, Durée: ${Math.round(estimatedDuration / 60)} min`);
                
                // Stocker la référence au polyline
                polylinesRef.current = polylinesRef.current || [];
                polylinesRef.current.push(directPolyline);
                
                // Passer au segment suivant malgré l'erreur
                calculateRoute(index + 1);
              }
            });
          }
          
          // Mettre à jour les statistiques
          if (status === 'OK' && result && result.routes && result.routes.length > 0 && 
              result.routes[0].legs && result.routes[0].legs.length > 0) {
            const leg = result.routes[0].legs[0];
            
            if (leg.distance && leg.duration) {
              totalDistance += leg.distance.value;
              totalDuration += leg.duration.value;
              
              console.log(`Distance: ${leg.distance.text}, Durée: ${leg.duration.text}`);
            }
          }
          
          // Passer au segment suivant
          calculateRoute(index + 1);
        });
      };
      
      // Commencer le calcul des itinéraires
      calculateRoute(0);
    }
    
    // Ajuster la vue pour inclure tous les marqueurs
    if (markersRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      
      markersRef.current.forEach(({ marker }) => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      
      map.fitBounds(bounds);
      
      // Ajuster le zoom si un seul marqueur
      if (markersRef.current.length === 1) {
        map.setZoom(13);
      }
    }
  }, [sites, allSites]);
  
  // Fonction pour optimiser la tournée
  const handleOptimizeTour = async () => {
    if (sites.length < 3) return;
    
    setOptimizationLoading(true);
    setError(null);
    
    try {
      // Préserver l'heure de départ du premier site
      const departureTime = new Date(sites[0].heureArrivee);
      console.log(`Optimisation avec heure de départ: ${departureTime.toLocaleString()}`);
      
      // Préparer les sites dans le bon format pour l'optimisation
      const sitesForOptimization = sites.map(site => {
        const originalId = site.siteId || getOriginalSiteId(site.id);
        const siteData = allSites[originalId];
        if (!siteData) {
          throw new Error(`Site ${originalId} introuvable dans la liste des sites`);
        }
        return {
          ...siteData,
          id: originalId,
          tourSiteId: site.id  // garder une référence à l'id du siteTournee
        };
      });
      
      // Vérifier que nous avons tous les sites avant d'optimiser
      if (sitesForOptimization.length !== sites.length) {
        throw new Error(`Erreur de préparation des sites: ${sitesForOptimization.length} sites préparés sur ${sites.length} attendus`);
      }
      
      // Premier et dernier site à préserver
      const firstSite = sitesForOptimization[0];
      const lastSite = sitesForOptimization[sitesForOptimization.length - 1];
      
      try {
        // Tenter l'optimisation avec le service de carte
        const optimizationResult = await mapService.optimizeTour(sitesForOptimization, departureTime);
        console.log("Résultat de l'optimisation:", optimizationResult);
        
        // Convertir l'ordre optimisé en ordre de tour sites
        // Il faut maintenir les IDs originaux de SiteTournee
        const optimizedOrder = optimizationResult.sitesOrder.map(siteId => {
          // Trouver le site tournée correspondant à cet ID
          const site = sites.find(s => {
            const originalId = s.siteId || getOriginalSiteId(s.id);
            return originalId === siteId;
          });
          
          if (!site) {
            throw new Error(`Site avec ID ${siteId} introuvable après optimisation`);
          }
          
          return site.id;
        });
        
        // Vérifier que le premier site est bien le même
        if (optimizedOrder[0] !== sites[0].id) {
          console.warn("Le premier site a changé, on force le site initial");
          optimizedOrder[0] = sites[0].id;
        }
        
        // Vérifier que le dernier site est bien le même
        if (optimizedOrder[optimizedOrder.length - 1] !== sites[sites.length - 1].id) {
          console.warn("Le dernier site a changé, on force le site final");
          optimizedOrder[optimizedOrder.length - 1] = sites[sites.length - 1].id;
        }
        
        // Vérifier que tous les sites sont présents
        if (optimizedOrder.length !== sites.length) {
          throw new Error(`Erreur: ${optimizedOrder.length} sites dans l'ordre optimisé, ${sites.length} attendus`);
        }
        
        // Effectuer l'optimisation avec cet ordre
        console.log("Ordre optimisé:", optimizedOrder);
        onOptimize(optimizedOrder);
        
      } catch (error) {
        console.error("Erreur d'optimisation avec le service:", error);
        throw error; // Remonter l'erreur pour utiliser la méthode de secours
      }
      
    } catch (err) {
      console.error('Erreur lors de l\'optimisation de la tournée:', err);
      
      // Méthode de secours si le service d'optimisation échoue
      try {
        // Préserver les sites de départ et d'arrivée
        const departSite = sites[0];
        const arriveeSite = sites[sites.length - 1];
        
        // Extraire tous les sites pour l'optimisation
        const sitesWithCoords = sites.map(site => {
          const originalId = site.siteId || getOriginalSiteId(site.id);
          const siteData = allSites[originalId];
          if (!siteData || !siteData.latitude || !siteData.longitude) {
            console.warn(`Site ${originalId} n'a pas de coordonnées valides`);
          }
          return {
            id: site.id,
            siteId: originalId,
            lat: siteData?.latitude,
            lng: siteData?.longitude,
            ordre: site.ordre
          };
        }).filter(site => site.lat !== undefined && site.lng !== undefined);
        
        // Vérifier que tous les sites ont été correctement traités
        if (sitesWithCoords.length !== sites.length) {
          setError("Certains sites n'ont pas de coordonnées valides. Impossible d'optimiser.");
          setOptimizationLoading(false);
          return;
        }
        
        // Extraire uniquement les points intermédiaires pour l'optimisation
        const intermediatePoints = sitesWithCoords.slice(1, sitesWithCoords.length - 1);
        
        console.log(`Optimisation locale de ${intermediatePoints.length} points intermédiaires (${sites.length} sites au total)`);
        
        // Calculer un ordre optimisé pour les points intermédiaires
        // Utiliser un algorithme glouton simple du "plus proche voisin" pour réduire la distance
        const optimizedIntermediateOrder = [];
        const unvisited = new Set(intermediatePoints.map(site => site.id));
        
        // À partir du point de départ
        let currentLat = sitesWithCoords[0].lat;
        let currentLng = sitesWithCoords[0].lng;
        
        // Trouver le site le plus proche à chaque étape
        while (unvisited.size > 0) {
          let minDistance = Infinity;
          let nextId = null;
          
          // Parcourir tous les sites non visités
          for (const siteId of unvisited) {
            const site = intermediatePoints.find(s => s.id === siteId);
            if (!site) continue;
            
            // Calculer la distance euclidienne (une approximation simple)
            const distance = Math.sqrt(
              Math.pow(site.lat - currentLat, 2) + 
              Math.pow(site.lng - currentLng, 2)
            );
            
            if (distance < minDistance) {
              minDistance = distance;
              nextId = siteId;
            }
          }
          
          if (nextId) {
            optimizedIntermediateOrder.push(nextId);
            unvisited.delete(nextId);
            
            // Mettre à jour le point actuel
            const nextSite = intermediatePoints.find(s => s.id === nextId);
            if (nextSite) {
              currentLat = nextSite.lat;
              currentLng = nextSite.lng;
            }
          } else {
            break; // Sortir si plus aucun site n'est trouvé
          }
        }
        
        // Vérifier que tous les points intermédiaires ont été inclus
        if (optimizedIntermediateOrder.length !== intermediatePoints.length) {
          setError("Erreur lors de l'optimisation : certains sites n'ont pas été traités");
          setOptimizationLoading(false);
          return;
        }
        
        // Inverser si nécessaire pour se rapprocher du point d'arrivée
        if (optimizedIntermediateOrder.length > 0) {
          const lastIntermediateId = optimizedIntermediateOrder[optimizedIntermediateOrder.length - 1];
          const lastIntermediate = intermediatePoints.find(s => s.id === lastIntermediateId);
          
          if (lastIntermediate) {
            const distanceToArrivee = Math.sqrt(
              Math.pow(lastIntermediate.lat - sitesWithCoords[sitesWithCoords.length - 1].lat, 2) + 
              Math.pow(lastIntermediate.lng - sitesWithCoords[sitesWithCoords.length - 1].lng, 2)
            );
            
            const distanceToDepart = Math.sqrt(
              Math.pow(lastIntermediate.lat - sitesWithCoords[0].lat, 2) + 
              Math.pow(lastIntermediate.lng - sitesWithCoords[0].lng, 2)
            );
            
            // Si le dernier point est plus proche du départ que de l'arrivée, inverser l'ordre
            if (distanceToDepart < distanceToArrivee) {
              optimizedIntermediateOrder.reverse();
            }
          }
        }
        
        // Combiner le tout : départ + points intermédiaires optimisés + arrivée
        const finalOrder = [departSite.id, ...optimizedIntermediateOrder, arriveeSite.id];
        
        // Vérifier que tous les sites sont présents dans l'ordre final
        if (finalOrder.length !== sites.length) {
          setError("Erreur lors de l'optimisation : nombre incorrect de sites");
          setOptimizationLoading(false);
          return;
        }
        
        console.log("Ordre optimisé (secours):", finalOrder);
        
        // Effectuer l'optimisation
        onOptimize(finalOrder);
        
      } catch (fallbackError) {
        console.error('Erreur lors de l\'optimisation de secours:', fallbackError);
        setError("Impossible d'optimiser l'itinéraire. Veuillez réessayer.");
      }
    } finally {
      setOptimizationLoading(false);
    }
  };
  
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
        ref={mapContainerRef}
      />
    </Paper>
  );
};

export default React.memo(MapView);