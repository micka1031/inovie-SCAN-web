import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, onSnapshot, Timestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { geocodeAddress } from '../utils/geocoding';
import { mapService } from '../services/mapService';
import './MapView.css';
import { MarkerPreference } from '../types';

// Types
interface Site {
  id: string;
  nom: string;
  adresse: string;
  ville?: string;
  codePostal?: string;
  codeBarres: string;
  latitude?: number;
  longitude?: number;
  type?: string;
  pole?: string;
  isGeneratedCoordinates?: boolean;
}

interface CourierLocation {
  id: string;
  nom: string;
  tourneeId: string;
  tourneeName: string;
  siteId: string;
  siteName: string;
  latitude: number;
  longitude: number;
  lastScan: Timestamp;
  isArrival: boolean;
}

interface Tournee {
  id: string;
  nom: string;
}

// Types de sites disponibles
const SITE_TYPES = [
  'Laboratoire',
  'Clinique',
  'Plateau technique',
  'Point de collecte',
  'Etablissement de santé',
  'Ehpad',
  'Vétérinaire'
];

// Pôles disponibles
const POLES = [
  'Nord',
  'Sud',
  'Est',
  'Ouest',
  'Centre'
];

// Fonction pour normaliser les types de sites
const normalizeType = (type: string | undefined): string => {
  if (!type) return '';
  
  const normalized = type.toLowerCase().trim();
  
  // Normaliser les types courants avec des correspondances plus précises
  const typeMap: { [key: string]: string } = {
    'labo': 'laboratoire',
    'laboratoire': 'laboratoire',
    'plateau': 'plateau technique',
    'plateau technique': 'plateau technique',
    'clinique': 'clinique',
    'collect': 'point de collecte',
    'point de collecte': 'point de collecte',
    'etablissement': 'etablissement de santé',
    'établissement': 'etablissement de santé',
    'etablissement de santé': 'etablissement de santé',
    'établissement de santé': 'etablissement de santé',
    'ehpad': 'ehpad',
    'veterinaire': 'veterinaire',
    'vétérinaire': 'veterinaire'
  };
  
  // Recherche de correspondance exacte ou partielle
  for (const [key, value] of Object.entries(typeMap)) {
    if (normalized === key || normalized.includes(key)) {
      return value;
    }
  }
  
  return normalized;
};

// Couleurs pour les différents types de sites
const typeColors: { [key: string]: string } = {
  'laboratoire': '#FF5252', // rouge
  'clinique': '#2196F3', // bleu
  'plateau technique': '#9C27B0', // violet
  'point de collecte': '#4CAF50', // vert
  'etablissement de santé': '#FF9800', // orange
  'ehpad': '#795548', // marron
  'veterinaire': '#607D8B' // gris-bleu
};

// Couleurs pour les différents pôles
const poleColors: { [key: string]: string } = {
  'nord': '#F44336', // rouge
  'sud': '#2196F3', // bleu
  'est': '#4CAF50', // vert
  'ouest': '#FF9800', // orange
  'centre': '#9C27B0' // violet
};

// Composant principal
const MapViewGoogle: React.FC = () => {
  // States
  const [sites, setSites] = useState<Site[]>([]);
  const [coursiers, setCoursiers] = useState<CourierLocation[]>([]);
  const [tournees, setTournees] = useState<Tournee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<string[]>(SITE_TYPES);
  const [visiblePoles, setVisiblePoles] = useState<string[]>(POLES);
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const [showGeneratedCoordinates, setShowGeneratedCoordinates] = useState<boolean>(false);
  const [siteFilter, setSiteFilter] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [mapPreferences, setMapPreferences] = useState<MarkerPreference[]>([]);
  
  // Refs
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{[id: string]: google.maps.Marker}>({});
  const infoWindowsRef = useRef<{[id: string]: google.maps.InfoWindow}>({});
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  
  // Chargement des données
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Charger les sites
        const sitesQuery = query(collection(db, 'sites'));
        const sitesSnapshot = await getDocs(sitesQuery);
        const sitesData = sitesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Site[];
        
        setSites(sitesData);
        
        // Charger les préférences de marqueurs
        const preferencesQuery = query(collection(db, 'markerPreferences'));
        const preferencesSnapshot = await getDocs(preferencesQuery);
        const preferencesData = preferencesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MarkerPreference[];
        
        setMapPreferences(preferencesData);
        
        // Configuration de la mise à jour en temps réel des coursiers
        const coursiersQuery = query(collection(db, 'courierLocations'), 
                                    where('lastScan', '>', Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000))));
        
        const unsubscribe = onSnapshot(coursiersQuery, (snapshot) => {
          const coursiersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as CourierLocation[];
          
          setCoursiers(coursiersData);
        }, (err) => {
          console.error('Erreur lors de la mise à jour des coursiers:', err);
          setError('Erreur lors du chargement des données des coursiers');
        });
        
        // Charger les tournées
        const tourneesQuery = query(collection(db, 'tournees'));
        const tourneesSnapshot = await getDocs(tourneesQuery);
        const tourneesData = tourneesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Tournee[];
        
        setTournees(tourneesData);
        
        setLoading(false);
        
        // Nettoyage
        return () => {
          unsubscribe();
        };
        
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
        setError('Erreur lors du chargement des données');
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Initialisation de la carte
  useEffect(() => {
    const initMap = async () => {
      if (!mapContainerRef.current) return;
      
      try {
        // Charger l'API Google Maps
        await mapService.loadGoogleMapsAPI();
        
        if (!window.google || !window.google.maps) {
          setError("Impossible de charger l'API Google Maps");
          return;
        }
        
        // Créer la carte
        const mapOptions: google.maps.MapOptions = {
          center: { lat: 46.603354, lng: 1.888334 }, // Centre de la France
          zoom: 6,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          fullscreenControl: true,
          mapTypeControl: true,
          streetViewControl: false,
          zoomControl: true
        };
        
        const map = new google.maps.Map(mapContainerRef.current, mapOptions);
        mapRef.current = map;
        
        // Ajouter les contrôles personnalisés
        addCustomControls(map);
        
      } catch (err) {
        console.error('Erreur lors de l\'initialisation de la carte:', err);
        setError('Erreur lors de l\'initialisation de la carte Google Maps');
      }
    };
    
    initMap();
    
    // Nettoyage
    return () => {
      // Supprimer tous les marqueurs et polylines
      Object.values(markersRef.current).forEach(marker => marker.setMap(null));
      polylinesRef.current.forEach(polyline => polyline.setMap(null));
      
      // Réinitialiser les références
      markersRef.current = {};
      infoWindowsRef.current = {};
      polylinesRef.current = [];
    };
  }, []);
  
  // Mise à jour des marqueurs lorsque les données ou les filtres changent
  useEffect(() => {
    if (!mapRef.current || !window.google || !window.google.maps) return;
    
    // Nettoyer les marqueurs existants
    Object.values(markersRef.current).forEach(marker => marker.setMap(null));
    markersRef.current = {};
    
    // Filtrer les sites à afficher
    const filteredSites = sites.filter(site => {
      // Vérifier si le site a des coordonnées
      if (!site.latitude || !site.longitude) return false;
      
      // Vérifier si le type est visible
      const siteType = normalizeType(site.type);
      if (!visibleTypes.some(t => t.toLowerCase() === siteType)) return false;
      
      // Vérifier si le pôle est visible
      if (site.pole && !visiblePoles.some(p => p.toLowerCase() === site.pole?.toLowerCase())) return false;
      
      // Vérifier si les coordonnées générées doivent être affichées
      if (site.isGeneratedCoordinates && !showGeneratedCoordinates) return false;
      
      // Vérifier le filtre de recherche
      if (siteFilter) {
        const searchTerm = siteFilter.toLowerCase();
        return (
          site.nom.toLowerCase().includes(searchTerm) ||
          site.adresse.toLowerCase().includes(searchTerm) ||
          (site.ville && site.ville.toLowerCase().includes(searchTerm)) ||
          (site.codePostal && site.codePostal.toLowerCase().includes(searchTerm))
        );
      }
      
      return true;
    });
    
    // Ajouter les marqueurs pour les sites filtrés
    filteredSites.forEach(site => {
      if (!site.latitude || !site.longitude) return;
      
      // Déterminer la couleur du marqueur
      let markerColor = '#1976D2'; // Bleu par défaut
      
      if (site.type) {
        const normalizedType = normalizeType(site.type);
        markerColor = typeColors[normalizedType] || markerColor;
      }
      
      // Créer le marqueur
      const marker = new google.maps.Marker({
        position: { lat: site.latitude, lng: site.longitude },
        map: mapRef.current,
        title: site.nom,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: markerColor,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 10
        },
        label: showLabels ? site.nom.substring(0, 1) : null
      });
      
      // Créer l'infowindow
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; color: #1976D2;">${site.nom}</h3>
            <p style="margin: 4px 0;"><strong>Type:</strong> ${site.type || 'Non défini'}</p>
            <p style="margin: 4px 0;"><strong>Adresse:</strong> ${site.adresse}</p>
            <p style="margin: 4px 0;"><strong>Ville:</strong> ${site.ville || ''} ${site.codePostal || ''}</p>
            <p style="margin: 4px 0;"><strong>Pôle:</strong> ${site.pole || 'Non défini'}</p>
            ${site.isGeneratedCoordinates ? '<p style="margin: 4px 0; color: #F44336;"><strong>Coordonnées générées automatiquement</strong></p>' : ''}
          </div>
        `
      });
      
      // Ajouter l'événement de clic
      marker.addListener('click', () => {
        // Fermer toutes les autres infowindows
        Object.values(infoWindowsRef.current).forEach(infoWindow => infoWindow.close());
        
        // Ouvrir cette infowindow
        infoWindow.open(mapRef.current, marker);
      });
      
      // Stocker les références
      markersRef.current[site.id] = marker;
      infoWindowsRef.current[site.id] = infoWindow;
    });
    
    // Ajuster la vue pour inclure tous les marqueurs
    if (Object.keys(markersRef.current).length > 0) {
      const bounds = new google.maps.LatLngBounds();
      
      Object.values(markersRef.current).forEach(marker => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      
      mapRef.current.fitBounds(bounds);
      
      // Ajuster le zoom si un seul marqueur
      if (Object.keys(markersRef.current).length === 1) {
        mapRef.current.setZoom(13);
      }
    }
    
  }, [sites, coursiers, visibleTypes, visiblePoles, showLabels, showGeneratedCoordinates, siteFilter]);
  
  // Fonction pour ajouter des contrôles personnalisés à la carte
  const addCustomControls = (map: google.maps.Map) => {
    // À implémenter ultérieurement
  };
  
  // Gérer le changement des types visibles
  const handleTypeToggle = (type: string) => {
    setVisibleTypes(prev => {
      const normalized = type.toLowerCase();
      if (prev.some(t => t.toLowerCase() === normalized)) {
        return prev.filter(t => t.toLowerCase() !== normalized);
      } else {
        return [...prev, type];
      }
    });
  };
  
  // Gérer le changement des pôles visibles
  const handlePoleToggle = (pole: string) => {
    setVisiblePoles(prev => {
      if (prev.includes(pole)) {
        return prev.filter(p => p !== pole);
      } else {
        return [...prev, pole];
      }
    });
  };
  
  // Fonction pour zoomer sur un site
  const handleZoomToSite = (site: Site) => {
    if (!mapRef.current || !site.latitude || !site.longitude) return;
    
    mapRef.current.setCenter({ lat: site.latitude, lng: site.longitude });
    mapRef.current.setZoom(15);
    
    // Ouvrir l'infowindow du site
    const marker = markersRef.current[site.id];
    const infoWindow = infoWindowsRef.current[site.id];
    
    if (marker && infoWindow) {
      // Fermer toutes les autres infowindows
      Object.values(infoWindowsRef.current).forEach(infoWindow => infoWindow.close());
      
      // Ouvrir cette infowindow
      infoWindow.open(mapRef.current, marker);
    }
  };
  
  if (loading) {
    return <div>Chargement de la carte...</div>;
  }
  
  if (error) {
    return <div>Erreur: {error}</div>;
  }
  
  return (
    <div className="map-container">
      <div className="map-controls">
        {/* Contrôles de la carte - à implémenter */}
      </div>
      <div 
        ref={mapContainerRef} 
        style={{ width: '100%', height: '100%', minHeight: '500px' }}
      />
    </div>
  );
};

export default MapViewGoogle; 