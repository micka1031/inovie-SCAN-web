import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, onSnapshot, Timestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { geocodeAddress } from '../utils/geocoding';
import { mapService } from '../services/mapService';
import './MapView.css';

// Ajouter les déclarations globales au début du fichier
declare global {
  interface Window {
    MarkerClusterer: any;
    google: {
      maps: {
        Map: any;
        Marker: any;
        InfoWindow: any;
        LatLngBounds: any;
        LatLng: any;
        Point: any;
        Size: any;
        SymbolPath: any;
        Animation: any;
        ControlPosition: any;
        MapTypeId: any;
        MapTypeControlStyle: any;
        MarkerOptions: any;
        event: any;
        OverlayView: any;
        places: {
          PlacesService: any;
        };
      }
    };
  }
}

// Déclaration pour TypeScript
declare global {
  interface Window {
    [key: string]: any;
  }
}

// Ajouter la déclaration du type MarkerClusterer pour TypeScript
declare class MarkerClusterer {
  constructor(map: any, markers: any[], options?: any);
  addMarker(marker: any, noDraw?: boolean): void;
  removeMarker(marker: any, noDraw?: boolean): boolean;
  clearMarkers(): void;
  fitMapToMarkers(): void;
  repaint(): void;
}

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
  telephone?: string;
  email?: string;
}

interface MarkerPreference {
  id: string;
  siteType: string;
  color: string;
  icon: string;
  apercu: string;
  name: string;
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

// Déplacer ces interfaces et types à l'extérieur du composant
interface MapViewState {
  center: { lat: number; lng: number };
  zoom: number;
}

// Fonction utilitaire normale (pas un hook) à l'extérieur du composant
const normalizeType = (type: string | undefined): string => {
  if (!type) return '';
  
  // Normalisation des types pour la correspondance
  return type.toLowerCase()
    .trim()
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/[ùûü]/g, 'u')
    .replace(/[ôö]/g, 'o')
    .replace(/[îï]/g, 'i')
    .replace(/[ç]/g, 'c')
    .replace(/\s+/g, ' ');
};

// Fonction utilitaire pour formater les noms de types pour l'affichage
const formatTypeName = (type: string): string => {
  if (!type) return '';
  
  // Mettre en forme pour l'affichage
  return type.charAt(0).toUpperCase() + type.slice(1);
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

const DEFAULT_CENTER = { lat: 48.864716, lng: 2.349014 }; // Paris, France
const DEFAULT_ZOOM = 5;

// Liste des couleurs de marqueurs par défaut pour différentes catégories
const TYPE_COLORS: Record<string, string> = {
  'centre de tri': '#FF5733',
  'agence': '#33FF57',
  'point relais': '#3357FF',
  'entrepôt': '#FF33A6',
  'default': '#777777'
};

// Style pour les marqueurs Google Maps
const markerStyles = {
  backgroundColor: '#1976D2',
  color: '#FFFFFF',
  borderRadius: '50%',
  border: '2px solid #FFFFFF',
  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  fontSize: '12px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '20px',         // Réduit de 30px à 20px
  height: '20px',        // Réduit de 30px à 20px
};

// Mise en cache optimisée des données - à l'intérieur du composant mais pas dans des hooks
interface CachedData<T> {
  timestamp: number;
  data: T;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes en ms

// Fonction générique de récupération depuis le cache - à l'intérieur du composant
const getFromCache = <T,>(key: string, maxAge: number = CACHE_DURATION): T | null => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached) as CachedData<T>;
      if (Date.now() - timestamp < maxAge) {
        console.log(`Utilisation des données en cache pour ${key}`);
        return data;
      } else {
        console.log(`Cache expiré pour ${key}`);
      }
    }
  } catch (error) {
    console.error(`Erreur lors de la lecture du cache pour ${key}:`, error);
  }
  return null;
};

// Fonction générique d'enregistrement dans le cache - à l'intérieur du composant
const saveToCache = <T,>(key: string, data: T): void => {
  try {
    const cacheItem: CachedData<T> = {
      timestamp: Date.now(),
      data
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
    console.log(`Données mises en cache pour ${key}`);
  } catch (error) {
    console.error(`Erreur lors de l'enregistrement dans le cache pour ${key}:`, error);
  }
};

// État pour stocker les chargements en cours - CECI CAUSE L'ERREUR CAR USESTATE NE PEUT PAS ÊTRE APPELÉ EN DEHORS D'UN COMPOSANT REACT
// Supprimons cet appel à useState ici
// const [dataLoading, setDataLoading] = useState({
//   sites: false,
//   preferences: false,
//   types: false,
//   poles: false
// });

// Composant principal
const MapView: React.FC = () => {
  // Déplacer les interfaces et types ici si elles sont spécifiques au composant
  
  // État pour stocker les chargements en cours - AJOUTÉ ICI À L'INTÉRIEUR DU COMPOSANT
  const [dataLoading, setDataLoading] = useState({
    sites: false,
    preferences: false,
    types: false,
    poles: false
  });
  
  // États pour les données chargées
  const [sites, setSites] = useState<Site[]>([]);
  const [coursiers, setCoursiers] = useState<CourierLocation[]>([]);
  const [tournees, setTournees] = useState<Tournee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingStatus, setGeocodingStatus] = useState<string | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Record<string, boolean>>({});
  const [visiblePoles, setVisiblePoles] = useState<Record<string, boolean>>({});
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const [showGeneratedCoordinates, setShowGeneratedCoordinates] = useState<boolean>(false);
  const [siteFilter, setSiteFilter] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [mapPreferences, setMapPreferences] = useState<MarkerPreference[]>([]);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState<boolean>(window.__googleMapsInitialized || false);
  
  // Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const labelsRef = useRef<{ overlay: google.maps.OverlayView, element: HTMLElement }[]>([]);
  
  // Référence pour le rafraîchissement des marqueurs
  const [shouldRefreshMarkers, setShouldRefreshMarkers] = useState(false);
  
  // État pour le clusterer
  const [markerClusterer, setMarkerClusterer] = useState<any>(null);
  
  // Référence pour suivre si la carte a déjà été initialisée
  const mapInitializedRef = useRef<boolean>(false);
  
  // Chargement des données optimisé
  useEffect(() => {
    const loadSites = async () => {
      try {
        setDataLoading(prev => ({ ...prev, sites: true }));
        
        // Vérifier le cache d'abord
        const cachedSites = getFromCache<Site[]>('mapSitesCache');
        if (cachedSites && cachedSites.length > 0) {
          console.log(`Récupération de ${cachedSites.length} sites depuis le cache`);
          setSites(cachedSites);
          setDataLoading(prev => ({ ...prev, sites: false }));
          return cachedSites;
        }
        
        // Charger depuis Firestore si pas de cache
        console.log("Chargement des sites depuis Firestore...");
        const sitesQuery = query(collection(db, 'sites'));
        const sitesSnapshot = await getDocs(sitesQuery);
        
        // Mapping avec transformation des données brutes
        const sitesData = sitesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Site[];
        
        console.log(`${sitesData.length} sites récupérés depuis Firestore`);
        
        // Filtrer pour ne conserver que les sites avec coordonnées valides
        const validSites = sitesData.filter(site => {
          const lat = typeof site.latitude === 'string' ? parseFloat(site.latitude) : site.latitude;
          const lng = typeof site.longitude === 'string' ? parseFloat(site.longitude) : site.longitude;
          return lat !== undefined && lng !== undefined && !isNaN(Number(lat)) && !isNaN(Number(lng));
        });
        
        console.log(`${validSites.length} sites ont des coordonnées valides`);
        
        // Mettre à jour le cache et l'état
        saveToCache('mapSitesCache', validSites);
        setSites(validSites);
        setDataLoading(prev => ({ ...prev, sites: false }));
        return validSites;
      } catch (error) {
        console.error('Erreur lors du chargement des sites:', error);
        setDataLoading(prev => ({ ...prev, sites: false }));
        setError('Erreur lors du chargement des sites');
        return [];
      }
    };
    
    const loadPreferences = async () => {
      try {
        setDataLoading(prev => ({ ...prev, preferences: true }));
        
        // Vérifier le cache d'abord
        const cachedPreferences = getFromCache<MarkerPreference[]>('mapPreferencesCache');
        if (cachedPreferences && cachedPreferences.length > 0) {
          console.log(`Récupération de ${cachedPreferences.length} préférences depuis le cache`);
          setMapPreferences(cachedPreferences);
          setDataLoading(prev => ({ ...prev, preferences: false }));
          return;
        }
        
        // Charger depuis Firestore si pas de cache
        console.log("Chargement des préférences depuis Firestore...");
        const preferencesQuery = query(collection(db, 'markerPreferences'));
        const preferencesSnapshot = await getDocs(preferencesQuery);
        const preferencesData = preferencesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MarkerPreference[];
        
        // Mettre à jour le cache et l'état
        saveToCache('mapPreferencesCache', preferencesData);
        setMapPreferences(preferencesData);
        setDataLoading(prev => ({ ...prev, preferences: false }));
      } catch (error) {
        console.error('Erreur lors du chargement des préférences:', error);
        setDataLoading(prev => ({ ...prev, preferences: false }));
        setError('Erreur lors du chargement des préférences');
      }
    };
    
    const loadInitialData = async () => {
      setLoading(true);
      const sitesData = await loadSites();
      await loadPreferences();
      
      // Chargement des types de sites
      await loadSiteTypes(sitesData);
      
      // Chargement des pôles
      await loadPoles(sitesData);
      
      setLoading(false);
    };
    
    loadInitialData();
    
    // Configurer l'écouteur pour les mises à jour des coursiers
    const setupCoursierListener = () => {
      const coursiersQuery = query(
        collection(db, 'courierLocations'), 
        where('lastScan', '>', Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)))
      );
      
      return onSnapshot(coursiersQuery, (snapshot) => {
        const coursiersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CourierLocation[];
        
        setCoursiers(coursiersData);
      }, (err) => {
        console.error('Erreur lors de la mise à jour des coursiers:', err);
        setError('Erreur lors du chargement des données des coursiers');
      });
    };
    
    // Chargement des tournées
    const loadTournees = async () => {
      try {
        const cachedTournees = getFromCache<Tournee[]>('mapTourneesCache');
        if (cachedTournees && cachedTournees.length > 0) {
          setTournees(cachedTournees);
          return;
        }
        
        const tourneesQuery = query(collection(db, 'tournees'));
        const tourneesSnapshot = await getDocs(tourneesQuery);
        const tourneesData = tourneesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Tournee[];
        
        saveToCache('mapTourneesCache', tourneesData);
        setTournees(tourneesData);
      } catch (error) {
        console.error('Erreur lors du chargement des tournées:', error);
      }
    };
    
    // Exécuter le chargement des tournées
    loadTournees();
    
    // Configurer l'écouteur pour les coursiers
    const unsubscribe = setupCoursierListener();
    
    // Nettoyage
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Fonction optimisée pour charger les types de sites
  const loadSiteTypes = async (sitesData: Site[] = []) => {
    try {
      setDataLoading(prev => ({ ...prev, types: true }));
      
      // Vérifier le cache d'abord
      const cachedTypes = getFromCache<Record<string, boolean>>('mapTypesVisibilityCache');
      if (cachedTypes && Object.keys(cachedTypes).length > 0) {
        console.log(`Récupération de ${Object.keys(cachedTypes).length} types depuis le cache`);
        setVisibleTypes(cachedTypes);
        setDataLoading(prev => ({ ...prev, types: false }));
        return;
      }
      
      // Charger depuis Firestore
      console.log("Chargement des types de sites depuis Firestore...");
      const siteTypesQuery = query(collection(db, 'siteTypes'));
      const siteTypesSnapshot = await getDocs(siteTypesQuery);
      
      // Log détaillé de la structure des documents
      console.log("Structure des documents siteTypes:", 
        siteTypesSnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data(),
          keys: Object.keys(doc.data())
        }))
      );
      
      let typesVisibility: Record<string, boolean> = {};
      
      if (!siteTypesSnapshot.empty) {
        // Essayer d'extraire les types de différents champs potentiels
        const typesFromDB = siteTypesSnapshot.docs
          .map(doc => {
            const data = doc.data();
            // Essayer plusieurs noms de champs possibles
            return data.name || data.type || data.nom || data.libelle || '';
          })
          .filter(Boolean);
        
        console.log("Types bruts extraits:", typesFromDB);
        
        // Normaliser et dédupliquer
        const uniqueTypes = [...new Set(typesFromDB.map(type => normalizeType(type)))];
        console.log("Types normalisés et dédupliqués:", uniqueTypes);
        
        // Initialiser tous les types comme visibles
        uniqueTypes.forEach(type => {
          if (type) typesVisibility[type] = true;
        });
      }
      
      // Si aucun type n'est défini, extraire des sites
      if (Object.keys(typesVisibility).length === 0 && sitesData.length > 0) {
        console.log("Extraction des types depuis les sites");
        const typesFromSites = [...new Set(sitesData
          .map(site => normalizeType(site.type))
          .filter(Boolean))];
        
        console.log("Types extraits des sites:", typesFromSites);
        
        typesFromSites.forEach(type => {
          if (type) typesVisibility[type] = true;
        });
      }
      
      // Si on a des types, les mettre en cache
      if (Object.keys(typesVisibility).length > 0) {
        saveToCache('mapTypesVisibilityCache', typesVisibility);
        setVisibleTypes(typesVisibility);
      } else {
        console.warn("Aucun type de site trouvé");
      }
      
      setDataLoading(prev => ({ ...prev, types: false }));
    } catch (error) {
      console.error("Erreur lors du chargement des types de sites:", error);
      setDataLoading(prev => ({ ...prev, types: false }));
    }
  };
  
  // Fonction optimisée pour charger les pôles
  const loadPoles = async (sitesData: Site[] = []) => {
    try {
      setDataLoading(prev => ({ ...prev, poles: true }));
      
      // Vérifier le cache d'abord
      const cachedPoles = getFromCache<Record<string, boolean>>('mapPolesVisibilityCache');
      if (cachedPoles && Object.keys(cachedPoles).length > 0) {
        console.log(`Récupération de ${Object.keys(cachedPoles).length} pôles depuis le cache`);
        setVisiblePoles(cachedPoles);
        setDataLoading(prev => ({ ...prev, poles: false }));
        return;
      }
      
      // Charger depuis Firestore
      console.log("Chargement des pôles depuis Firestore...");
      const polesQuery = query(collection(db, 'poles'));
      const polesSnapshot = await getDocs(polesQuery);
      
      // Log détaillé de la structure des documents
      console.log("Structure des documents poles:", 
        polesSnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data(),
          keys: Object.keys(doc.data())
        }))
      );
      
      let polesVisibility: Record<string, boolean> = {};
      
      // Créer une map d'ID de pôle vers nom de pôle pour la référence
      const poleIdToNameMap: Record<string, string> = {};
      
      if (!polesSnapshot.empty) {
        // Extraction avec inspection détaillée
        polesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          
          // Essayer plusieurs noms de champs possibles
          const poleName = data.nom || data.name || data.pole || data.libelle;
          
          if (poleName) {
            console.log(`Pôle trouvé dans le document ${doc.id}:`, poleName);
            // Ajouter au mapping ID -> Nom
            poleIdToNameMap[doc.id] = poleName;
            
            // Extraire le nom de base du pôle pour la visibilité
            let poleBase = "";
            
            // Tenter d'extraire le nom de base (nord, sud, est, ouest, centre)
            const match = poleName.toLowerCase().match(/\b(nord|sud|est|ouest|centre)\b/);
            if (match) {
              poleBase = match[0];
              console.log(`Extraction du nom de base du pôle "${poleBase}" depuis "${poleName}"`);
            } else {
              // Utiliser le nom complet en minuscules si aucune correspondance
              poleBase = poleName.toLowerCase().trim();
            }
            
            // Ajouter à la visibilité
            polesVisibility[poleBase] = true;
            console.log(`Ajout du pôle "${poleBase}" aux filtres de visibilité`);
          } else {
            // Si aucun champ évident, chercher dans toutes les clés
            for (const key of Object.keys(data)) {
              const value = data[key];
              if (typeof value === 'string' && value.length > 0) {
                console.log(`Utilisation du champ "${key}" comme nom de pôle:`, value);
                poleIdToNameMap[doc.id] = value;
                
                // Traitement similaire pour ce cas
                let poleBase = "";
                const match = value.toLowerCase().match(/\b(nord|sud|est|ouest|centre)\b/);
                if (match) {
                  poleBase = match[0];
                } else {
                  poleBase = value.toLowerCase().trim();
                }
                
                polesVisibility[poleBase] = true;
                console.log(`Ajout du pôle "${poleBase}" aux filtres de visibilité`);
                break;
              }
            }
          }
        });
        
        console.log("Mapping ID de pôle -> nom de pôle:", poleIdToNameMap);
        console.log("Pôles extraits pour les filtres de visibilité:", Object.keys(polesVisibility));
      }
      
      // Si aucun pôle n'est défini, extraire des sites
      if (Object.keys(polesVisibility).length === 0 && sitesData.length > 0) {
        console.log("Extraction des pôles depuis les sites");
        
        // Créer un ensemble de noms de base de pôles
        const polesFromSites = new Set<string>();
        
        sitesData.forEach(site => {
          if (site.pole) {
            let poleName = site.pole;
            
            // Vérifier si le pôle est un ID et le remplacer par le nom s'il existe
            if (poleIdToNameMap[poleName]) {
              poleName = poleIdToNameMap[poleName];
            }
            
            // Extraire le nom de base
            let poleBase = "";
            const match = poleName.toLowerCase().match(/\b(nord|sud|est|ouest|centre)\b/);
            if (match) {
              poleBase = match[0];
            } else {
              poleBase = poleName.toLowerCase().trim();
            }
            
            polesFromSites.add(poleBase);
          }
        });
        
        console.log("Pôles extraits des sites:", Array.from(polesFromSites));
        
        // Convertir en objet de visibilité
        polesFromSites.forEach(pole => {
          if (pole) polesVisibility[pole] = true;
        });
      }
      
      // Si on a des pôles, les mettre en cache
      if (Object.keys(polesVisibility).length > 0) {
        saveToCache('mapPolesVisibilityCache', polesVisibility);
        setVisiblePoles(polesVisibility);
        console.log("Pôles disponibles pour filtrage:", Object.keys(polesVisibility));
      } else {
        console.warn("Aucun pôle trouvé");
      }
      
      setDataLoading(prev => ({ ...prev, poles: false }));
    } catch (error) {
      console.error("Erreur lors du chargement des pôles:", error);
      setDataLoading(prev => ({ ...prev, poles: false }));
    }
  };
  
  // Fonction pour rafraîchir le cache selon un ensemble de clés
  const refreshCache = (keys: string[] = []) => {
    const allCacheKeys = [
      'mapSitesCache',
      'mapPreferencesCache',
      'mapTypesVisibilityCache',
      'mapPolesVisibilityCache',
      'mapTourneesCache'
    ];
    
    const keysToRefresh = keys.length > 0 ? keys : allCacheKeys;
    
    keysToRefresh.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Cache effacé pour ${key}`);
    });
    
    // Forcer le rechargement des données
    window.location.reload();
  };
  
  // Gestion d'erreurs globale
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error("Erreur globale capturée:", event.error);
      // Éviter que l'erreur ne remonte à l'utilisateur
      event.preventDefault();
    };
    
    window.addEventListener('error', handleGlobalError);
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);
  
  // Récupère les sites et initialise les filtres après l'initialisation de la carte
  useEffect(() => {
    if (googleMapRef.current && sites.length > 0 && Object.keys(visibleTypes).length === 0) {
      console.log("Initialisation des filtres avec les sites déjà chargés");
      
      // Charger les types de sites APRÈS que les sites sont chargés
      const fetchSiteTypes = async () => {
        try {
          const siteTypesQuery = query(collection(db, 'siteTypes'));
          const siteTypesSnapshot = await getDocs(siteTypesQuery);
          
          console.log("Documents siteTypes bruts:", siteTypesSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
          
          if (!siteTypesSnapshot.empty) {
            const typesFromDB = siteTypesSnapshot.docs.map(doc => {
              const data = doc.data();
              console.log("Champs disponibles dans siteType:", Object.keys(data));
              return data.name || data.type || data.nom || '';
            }).filter(Boolean);
            
            console.log("Types de sites depuis la base de données:", typesFromDB);
            
            // Initialiser la visibilité des types (tous visibles)
            const typesVisibility: Record<string, boolean> = {};
            typesFromDB.forEach(type => {
              if (type) {
                const normalizedType = normalizeType(type);
                typesVisibility[normalizedType] = true;
              }
            });
            
            if (Object.keys(typesVisibility).length > 0) {
              setVisibleTypes(typesVisibility);
            } else {
              // Extraire les types depuis les sites
              const typesFromSites = [...new Set(sites.map(site => normalizeType(site.type)).filter(Boolean))];
              const typesVisibilityFromSites: Record<string, boolean> = {};
              typesFromSites.forEach(type => { 
                if (type) typesVisibilityFromSites[type] = true; 
              });
              setVisibleTypes(typesVisibilityFromSites);
            }
          } else {
            // Extraire les types depuis les sites
            const typesFromSites = [...new Set(sites.map(site => normalizeType(site.type)).filter(Boolean))];
            const typesVisibility: Record<string, boolean> = {};
            typesFromSites.forEach(type => { 
              if (type) typesVisibility[type] = true; 
            });
            setVisibleTypes(typesVisibility);
          }
        } catch (error) {
          console.error("Erreur lors du chargement des types de sites:", error);
          // Fallback sur les données des sites
          const typesFromSites = [...new Set(sites.map(site => normalizeType(site.type)).filter(Boolean))];
          const typesVisibility: Record<string, boolean> = {};
          typesFromSites.forEach(type => { 
            if (type) typesVisibility[type] = true; 
          });
          setVisibleTypes(typesVisibility);
        }
      };
      
      fetchSiteTypes();
      fetchPoles();
      
      // Déclencher l'affichage des marqueurs
      setShouldRefreshMarkers(true);
    }
  }, [googleMapRef.current, sites]);

  // Fonction pour charger les pôles de façon optimisée
  const fetchPoles = async () => {
    try {
      const polesQuery = query(collection(db, 'poles'));
      const polesSnapshot = await getDocs(polesQuery);
      
      console.log("Documents poles bruts:", polesSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
      
      // Vérifier les champs disponibles dans chaque document
      const polesData = polesSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Champs disponibles:", Object.keys(data));
        return data.nom || data.name || data.pole || doc.id;
      }).filter(Boolean);
      
      console.log("Pôles extraits:", polesData);
      
      // Initialiser les filtres de pôles avec fallback sur les sites si nécessaire
      if (polesData.length > 0) {
        const polesVisibility: Record<string, boolean> = {};
        polesData.forEach(pole => {
          if (pole) polesVisibility[pole.toLowerCase()] = true;
        });
        setVisiblePoles(polesVisibility);
      } else {
        // Fallback sur les données des sites
        const polesFromSites = [...new Set(sites.map(site => site.pole?.toLowerCase()).filter(Boolean))];
        const polesVisibility: Record<string, boolean> = {};
        polesFromSites.forEach(pole => { 
          if (pole) polesVisibility[pole] = true; 
        });
        setVisiblePoles(polesVisibility);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des pôles:", error);
      // Fallback sur les données des sites en cas d'erreur
      const polesFromSites = [...new Set(sites.map(site => site.pole?.toLowerCase()).filter(Boolean))];
      const polesVisibility: Record<string, boolean> = {};
      polesFromSites.forEach(pole => { 
        if (pole) polesVisibility[pole] = true; 
      });
      setVisiblePoles(polesVisibility);
    }
  };

  // Fonction pour mettre à jour la visibilité des marqueurs sans les recréer (optimisée)
  const updateMarkersVisibility = useCallback(() => {
    console.log("=== MISE À JOUR DE LA VISIBILITÉ DES MARQUEURS ===");
    
    // Créer un mapping des IDs de pôle vers les noms
    const poleIdToNameMap: Record<string, string> = {};
    
    // Fonction pour charger les mappings de pôles
    const loadPoleMapping = async () => {
      try {
        const polesQuery = query(collection(db, 'poles'));
        const polesSnapshot = await getDocs(polesQuery);
        
        polesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const poleName = data.nom || data.name || data.pole || data.libelle;
          if (poleName) {
            poleIdToNameMap[doc.id] = poleName;
          }
        });
        
        console.log("Mapping ID de pôle → nom de pôle pour la visibilité:", poleIdToNameMap);
        updateVisibility();
      } catch (error) {
        console.error("Erreur lors du chargement des mappings de pôles:", error);
        // En cas d'erreur, continuer avec les données existantes
        updateVisibility();
      }
    };
    
    // Fonction pour mettre à jour la visibilité des marqueurs
    const updateVisibility = () => {
      // Batching des opérations DOM
      const start = performance.now();
      let visibleCount = 0;
      let totalCount = 0;
      
      // Afficher les clés utilisées pour le filtrage
      console.log("Clés de pôles utilisées pour le filtrage:", Object.keys(visiblePoles));
      
      // 1. Mise à jour des marqueurs
      markersRef.current.forEach(marker => {
        totalCount++;
        // Récupérer les données du site associées au marqueur
        const site = marker.get('siteData') as Site;
        if (!site) return;
        
        const siteType = normalizeType(site.type);
        
        // Déterminer le pôle correct (nom ou ID)
        let poleName = site.pole;
        
        // Si le pôle est un ID, essayer de le convertir en nom
        if (site.pole && poleIdToNameMap[site.pole]) {
          poleName = poleIdToNameMap[site.pole];
          console.log(`Site ${site.nom}: Conversion de l'ID pôle ${site.pole} en nom ${poleName}`);
        }
        
        // Normaliser le nom du pôle pour le filtrage (extraction du nom de base sans "Pôle")
        let poleBase = "";
        if (poleName) {
          // Extraire le nom de base du pôle (nord, sud, est, ouest, centre)
          const match = poleName.toLowerCase().match(/\b(nord|sud|est|ouest|centre)\b/);
          if (match) {
            poleBase = match[0];
            console.log(`Site ${site.nom}: Extraction du nom de base du pôle "${poleBase}" depuis "${poleName}"`);
          } else {
            // Utiliser le nom complet si aucune correspondance
            poleBase = poleName.toLowerCase();
          }
        }
        
        // Vérifier si les filtres sont initialisés
        const hasTypeFilters = Object.keys(visibleTypes).length > 0;
        const hasPoleFilters = Object.keys(visiblePoles).length > 0;
        
        // Déterminer la visibilité en fonction des filtres
        const isTypeVisible = !hasTypeFilters || !siteType || visibleTypes[siteType] !== false;
        
        // Pour le pôle, vérifier à la fois le nom complet, le nom de base et l'ID converti
        let isPoleVisible = !hasPoleFilters;
        
        if (hasPoleFilters) {
          // Si c'est un nouveau site avec le nom du pôle stocké directement (pas d'ID)
          if (poleBase && visiblePoles[poleBase] !== undefined) {
            isPoleVisible = visiblePoles[poleBase] !== false;
          } 
          // Si c'est un ancien site avec l'ID stocké
          else if (site.pole && poleIdToNameMap[site.pole]) {
            // Trouver la clé de visibilité correspondante
            const poleNameFromId = poleIdToNameMap[site.pole];
            const poleMatch = poleNameFromId.toLowerCase().match(/\b(nord|sud|est|ouest|centre)\b/);
            if (poleMatch && visiblePoles[poleMatch[0]] !== undefined) {
              isPoleVisible = visiblePoles[poleMatch[0]] !== false;
            }
          }
        }
        
        // Log détaillé pour déboguer
        if (site.nom.includes("Agde")) {
          console.log(`Site ${site.nom}: Pôle=${poleName}, Base=${poleBase}, Visible=${isPoleVisible}, Filtres=${JSON.stringify(visiblePoles)}`);
        }
        
        const isVisible = isTypeVisible && isPoleVisible;
        
        // Mettre à jour la visibilité du marqueur seulement si nécessaire
        if (marker.getVisible() !== isVisible) {
          marker.setVisible(isVisible);
        }
        
        if (isVisible) visibleCount++;
      });
      
      const end = performance.now();
      console.log(`Visibilité mise à jour pour ${totalCount} marqueurs (${visibleCount} visibles) en ${Math.round(end - start)}ms`);
      console.log("=== FIN DE LA MISE À JOUR DE LA VISIBILITÉ ===");
      
      // Mettre à jour le message d'erreur si nécessaire
      if (visibleCount === 0 && totalCount > 0) {
        setError("Aucun site ne correspond aux filtres actuels");
      } else if (error === "Aucun site ne correspond aux filtres actuels") {
        setError(null);
      }
    };
    
    // Démarrer le processus de mise à jour
    loadPoleMapping();
    
  }, [visibleTypes, visiblePoles, error]);

  // Fonction pour afficher les marqueurs sur la carte
  const displayMarkers = useCallback(() => {
    console.log("=== DÉBUT AFFICHAGE DES MARQUEURS ===");
    console.log("Vérification des prérequis pour l'affichage des marqueurs:");
    console.log("- Carte initialisée:", !!googleMapRef.current);
    console.log("- Nombre de sites:", sites.length);
    console.log("- Nombre de préférences:", mapPreferences.length);
    
    if (!googleMapRef.current || !sites.length || !mapPreferences.length) {
      console.log(`Impossible d'afficher les marqueurs`);
      return;
    }

    // Supprimer les marqueurs et infobulles existants
    if (markersRef.current.length > 0) {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    }

    if (infoWindowsRef.current.length > 0) {
      infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
      infoWindowsRef.current = [];
    }

    // Créer un objet bounds pour ajuster la vue de la carte
    const bounds = new google.maps.LatLngBounds();
    let markerCount = 0;
    
    // Chargement des IDs de pôles vers les noms
    const poleIdToNameMap: Record<string, string> = {};
    
    // Fonction pour charger les mappings de pôles (IDs -> noms)
    const loadPoleMapping = async () => {
      try {
        const polesQuery = query(collection(db, 'poles'));
        const polesSnapshot = await getDocs(polesQuery);
        
        polesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const poleName = data.nom || data.name || data.pole || data.libelle;
          if (poleName) {
            poleIdToNameMap[doc.id] = poleName;
          }
        });
        
        console.log("Mapping ID de pôle -> nom de pôle pour les marqueurs:", poleIdToNameMap);
        
        // Une fois les mappings chargés, afficher les marqueurs
        displaySiteMarkers();
      } catch (error) {
        console.error("Erreur lors du chargement des mappings de pôles:", error);
        // En cas d'erreur, afficher quand même les marqueurs avec les données existantes
        displaySiteMarkers();
      }
    };
    
    // Fonction principale pour afficher les marqueurs des sites
    const displaySiteMarkers = () => {
      // Pas de limitation du nombre de marqueurs
      const sitesToDisplay = sites;
      
      // Parcourir les sites et ajouter des marqueurs
      sitesToDisplay.forEach(site => {
        try {
          // Vérifier une dernière fois les coordonnées
          const lat = typeof site.latitude === 'string' ? parseFloat(site.latitude) : site.latitude;
          const lng = typeof site.longitude === 'string' ? parseFloat(site.longitude) : site.longitude;
          
          if (lat === undefined || lng === undefined || isNaN(Number(lat)) || isNaN(Number(lng))) {
            return; // Passer au site suivant
          }

          // Trouver la préférence de marqueur correspondant au type de site
          const normalizedType = normalizeType(site.type);
          
          // Chercher une correspondance exacte d'abord
          let preference = mapPreferences.find(pref => {
            const normalizedPrefType = normalizeType(pref.siteType);
            return normalizedPrefType === normalizedType;
          });

          // Si aucune correspondance exacte, chercher une correspondance partielle
          if (!preference) {
            preference = mapPreferences.find(pref => {
              const normalizedPrefType = normalizeType(pref.siteType);
              const siteIncludes = normalizedType.includes(normalizedPrefType);
              const prefIncludes = normalizedPrefType.includes(normalizedType);
              return siteIncludes || prefIncludes;
            });
          }

          // Valeur par défaut si aucune préférence n'est trouvée
          if (!preference) {
            preference = {
              id: 'default',
              siteType: site.type || 'Inconnu',
              color: '#FF0000',
              icon: 'circle',
              apercu: 'circle',
              name: site.type || 'Inconnu'
            };
          }

          // Créer l'objet de position
          const position = new google.maps.LatLng(lat, lng);
          
          // Configuration du marqueur basée sur l'aperçu
          const markerShape = preference.apercu || preference.icon || 'circle';
          
          let markerOptions: google.maps.MarkerOptions = {
            position,
            map: googleMapRef.current,
            title: site.nom
          };
          
          // Déterminer l'icône du marqueur en fonction de la forme
          let svgIcon = '';
          let iconScale = 1.0; // Augmenté de 0.8 à 1.0 pour des marqueurs plus grands

          // Convertir correctement les noms des formes
          const getFormeName = (formeName: string): string => {
            const formesMap: Record<string, string> = {
              'Épingle': 'pin',
              'Goutte d\'eau': 'droplet',
              'Cercle': 'circle',
              'Carré': 'square',
              'Triangle': 'triangle',
              'Diamant': 'diamond',
              'Hexagone': 'hexagon',
              'Étoile': 'star',
              'Cross': 'cross'
            };

            // Chercher d'abord une correspondance exacte
            if (formesMap[formeName]) {
              return formesMap[formeName].toLowerCase();
            }

            // Sinon, normaliser et chercher par correspondance partielle
            const normalizedName = formeName.toLowerCase();
            for (const [key, value] of Object.entries(formesMap)) {
              if (normalizedName.includes(key.toLowerCase()) || normalizedName.includes(value.toLowerCase())) {
                return value.toLowerCase();
              }
            }

            // Par défaut, retourner le nom en minuscules
            return formeName.toLowerCase();
          };

          // Convertir le nom de la forme
          const formeName = getFormeName(markerShape);

          switch (formeName) {
            case 'pin':
            case 'épingle':
              svgIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="16" height="24">
                  <path fill="${preference.color}" stroke="#FFFFFF" stroke-width="2" d="M12,0 C5.4,0 0,5.4 0,12 C0,18.2 10.4,34.2 10.8,34.8 C11.1,35.3 11.9,35.3 12.2,34.8 C12.6,34.2 24,17 24,12 C24,5.4 18.6,0 12,0 Z"/>
                  <circle cx="12" cy="12" r="4" fill="#FFFFFF" opacity="0.8"/>
                </svg>
              `;
              break;

            case 'droplet':
            case 'goutte d\'eau':
              svgIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="16" height="24">
                  <path fill="${preference.color}" stroke="#FFFFFF" stroke-width="2" d="M12,0 C12,0 0,16 0,24 C0,28.4 5.4,32 12,32 C18.6,32 24,28.4 24,24 C24,16 12,0 12,0 Z"/>
                </svg>
              `;
              break;

            case 'circle':
            case 'cercle':
              svgIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                  <circle cx="10" cy="10" r="8" fill="${preference.color}" stroke="#FFFFFF" stroke-width="2"/>
                </svg>
              `;
              break;

            case 'square':
            case 'carré':
              svgIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                  <rect x="2" y="2" width="16" height="16" fill="${preference.color}" stroke="#FFFFFF" stroke-width="2"/>
                </svg>
              `;
              break;

            case 'triangle':
              svgIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                  <polygon points="10,2 18,18 2,18" fill="${preference.color}" stroke="#FFFFFF" stroke-width="2"/>
                </svg>
              `;
              break;

            case 'diamond':
            case 'diamant':
              svgIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                  <polygon points="10,2 18,10 10,18 2,10" fill="${preference.color}" stroke="#FFFFFF" stroke-width="2"/>
                </svg>
              `;
              break;

            case 'hexagon':
            case 'hexagone':
              svgIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                  <polygon points="17,10 14,17 6,17 3,10 6,3 14,3" fill="${preference.color}" stroke="#FFFFFF" stroke-width="2"/>
                </svg>
              `;
              break;

            case 'star':
            case 'étoile':
              svgIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                  <polygon points="10,2 12.2,7.8 18,8.4 13.6,12.4 14.6,18 10,15 5.4,18 6.4,12.4 2,8.4 7.8,7.8" fill="${preference.color}" stroke="#FFFFFF" stroke-width="2"/>
                </svg>
              `;
              break;

            case 'cross':
            case 'croix':
              svgIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                  <path d="M7,2 L13,2 L13,7 L18,7 L18,13 L13,13 L13,18 L7,18 L7,13 L2,13 L2,7 L7,7 Z" fill="${preference.color}" stroke="#FFFFFF" stroke-width="2"/>
                </svg>
              `;
              break;

            default:
              svgIcon = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                  <circle cx="10" cy="10" r="8" fill="${preference.color}" stroke="#FFFFFF" stroke-width="2"/>
                </svg>
              `;
          }
          
          // Encoder le SVG pour l'URL
          const encodedSvg = encodeURIComponent(svgIcon);
          const svgUrl = "data:image/svg+xml," + encodedSvg;

          // Appliquer l'icône au marqueur avec une taille ajustée
          markerOptions.icon = {
            url: svgUrl,
            scaledSize: new google.maps.Size(18 * iconScale, formeName === 'pin' ? 27 * iconScale : formeName === 'droplet' ? 24 * iconScale : 18 * iconScale),
            anchor: formeName === 'pin' 
              ? new google.maps.Point(9 * iconScale, 27 * iconScale) // Ancrage épingle
              : formeName === 'droplet'
              ? new google.maps.Point(9 * iconScale, 24 * iconScale) // Ancrage goutte d'eau
              : new google.maps.Point(9 * iconScale, 9 * iconScale) // Ancrage standard
          };

          // Ajouter le label si l'option est activée
          if (showLabels) {
            // Utiliser le label natif de Google Maps
            markerOptions.label = {
              text: site.nom,
              color: "#000000",
              fontWeight: "bold",
              className: "map-marker-label"
            };
          }
          
          // Déterminer la visibilité initiale du marqueur en fonction des filtres
          const siteType = normalizeType(site.type);
          const sitePole = site.pole?.toLowerCase();
          
          const hasTypeFilters = Object.keys(visibleTypes).length > 0;
          const hasPoleFilters = Object.keys(visiblePoles).length > 0;
          
          // Définir les variables de visibilité
          const isTypeVisible = !hasTypeFilters || !siteType || visibleTypes[siteType] !== false;
          const isPoleVisible = !hasPoleFilters || !sitePole || visiblePoles[sitePole] !== false;
          
          // Appliquer la visibilité
          markerOptions.visible = isTypeVisible && isPoleVisible;

          // Créer le marqueur et l'ajouter à la carte
          const marker = new google.maps.Marker(markerOptions);
          
          // Stocker les données du site dans le marqueur pour faciliter le filtrage
          marker.set('siteData', site);
          
          // Déterminer le nom du pôle à afficher (utiliser le mapping si c'est un ID)
          let poleDisplayName = site.pole;
          
          // Vérifier si le pôle est un ID et le remplacer par le nom s'il existe
          if (site.pole && poleIdToNameMap[site.pole]) {
            poleDisplayName = poleIdToNameMap[site.pole];
            console.log(`Utilisation du nom de pôle "${poleDisplayName}" au lieu de l'ID "${site.pole}" pour le site "${site.nom}"`);
          }
          
          // Créer l'infobulle avec le contenu HTML initial
          const infoWindowContent = `
            <div class="info-window" style="max-width:300px; font-family:Arial,sans-serif;">
              <h3>${site.nom}</h3>
              <p><strong>Type:</strong> ${site.type || 'Non défini'}</p>
              <p><strong>Adresse:</strong> ${site.adresse || 'Non définie'}</p>
              ${poleDisplayName ? `<p><strong>Pôle:</strong> ${poleDisplayName}</p>` : ''}
              ${site.telephone ? `<p><strong>Téléphone:</strong> ${site.telephone}</p>` : ''}
              <p style="margin-top:10px; font-style:italic;">Chargement des informations Google Maps...</p>
            </div>
          `;
          
          const infoWindow = new google.maps.InfoWindow({
            content: infoWindowContent,
            maxWidth: 300
          });
          
          // Ajouter un écouteur d'événement pour ouvrir l'infobulle au clic
          marker.addListener('click', () => {
            // Fermer toutes les infobulles ouvertes
            infoWindowsRef.current.forEach(win => win.close());
            
            // Ouvrir l'infobulle cliquée
            infoWindow.open(googleMapRef.current, marker);
            
            // Récupérer et afficher les détails du lieu depuis Google Places
            const address = `${site.adresse || ''}, ${site.codePostal || ''} ${site.ville || ''}`.trim();
            getPlaceDetails(lat, lng, address, infoWindow, marker, site);
          });
          
          // Stocker le marqueur et l'infobulle pour pouvoir les réutiliser
          markersRef.current.push(marker);
          infoWindowsRef.current.push(infoWindow);
          
          // Si le marqueur est visible, l'ajouter aux limites de la carte
          if (markerOptions.visible) {
            bounds.extend(position);
            markerCount++;
          }
        } catch (err) {
          console.error(`Erreur lors de la création du marqueur:`, err);
        }
      });

      // Ajuster la vue de la carte pour afficher tous les marqueurs visibles
      if (markerCount > 0) {
        try {
          googleMapRef.current.fitBounds(bounds);
          
          // Si un seul marqueur, zoomer un peu plus
          if (markerCount === 1) {
            googleMapRef.current.setZoom(14);
          }
          
          // Effacer tout message d'erreur précédent
          setError(null);
        } catch (fitErr) {
          console.error("Erreur lors de l'ajustement de la vue de la carte:", fitErr);
        }
      }
    };

    // Démarrer le processus d'affichage
    loadPoleMapping();
    
    console.log("=== FIN AFFICHAGE DES MARQUEURS ===");
    setShouldRefreshMarkers(false);
    
    return () => {
      // Nettoyage si nécessaire
    };
  }, [sites, mapPreferences, visibleTypes, visiblePoles, showLabels]);
  
  // Optimisation du rafraîchissement des filtres
  const [filteredActive, setFilteredActive] = useState(false);
  
  // Utiliser updateMarkersVisibility au lieu de redessiner tous les marqueurs
  useEffect(() => {
    if (markersRef.current.length > 0) {
      console.log("Mise à jour de la visibilité des marqueurs existants");
      updateMarkersVisibility();
    } else if (googleMapRef.current && isGoogleMapsReady && sites.length > 0) {
      console.log("Création initiale des marqueurs");
      displayMarkers();
    }
  }, [visibleTypes, visiblePoles, updateMarkersVisibility, displayMarkers]);
  
  // Gérer séparément les modifications des options (labels, etc)
  useEffect(() => {
    if (markersRef.current.length > 0) {
      console.log("Recréation des marqueurs pour mettre à jour les labels");
      displayMarkers();
    }
  }, [showLabels, showGeneratedCoordinates, displayMarkers]);
  
  // Surveille l'initialisation de Google Maps
  useEffect(() => {
    console.log("Cycle d'initialisation de Google Maps démarré");
    console.log("État initial de l'API Google Maps:", isGoogleMapsReady);

    // Éviter de réinitialiser si déjà initialisé
    if (mapInitializedRef.current) {
      console.log("Google Maps déjà initialisé, ignorant le cycle");
      return;
    }

    if (!isGoogleMapsReady) {
      console.log("En attente de l'initialisation de Google Maps...");
      
      const handleGoogleMapsInit = () => {
        console.log("Événement d'initialisation Google Maps détecté");
        setIsGoogleMapsReady(true);
      };

      // Écouter l'événement d'initialisation de Google Maps
      window.addEventListener('google-maps-initialized', handleGoogleMapsInit);
      
      // Vérifie si Google Maps est déjà initialisé
      if (window.__googleMapsInitialized) {
        console.log("Google Maps déjà initialisé selon window.__googleMapsInitialized");
        setIsGoogleMapsReady(true);
      } else {
        // Essayer de charger Google Maps si ce n'est pas déjà fait
        mapService.loadGoogleMapsAPI()
          .then(() => {
            console.log("API Google Maps chargée avec succès");
            setIsGoogleMapsReady(true);
          })
          .catch(error => {
            console.error("Erreur lors du chargement de l'API Google Maps:", error);
            setError("Impossible de charger Google Maps. Veuillez rafraîchir la page.");
          });
      }

      return () => {
        window.removeEventListener('google-maps-initialized', handleGoogleMapsInit);
      };
    }
  }, []);
  
  // Initialise la carte uniquement lorsque Google Maps est prêt
  useEffect(() => {
    console.log("EFFET D'INITIALISATION DÉCLENCHÉ");
    
    // Vérifier si la carte a déjà été initialisée pour éviter les réinitialisations multiples
    if (isGoogleMapsReady && mapRef.current && !googleMapRef.current && !mapInitializedRef.current) {
      console.log("[GOOGLE MAPS] Initialisation forcée de la carte dans le composant MapView");
      mapInitializedRef.current = true; // Marquer la carte comme initialisée
      
      try {
        // Nettoyer la carte précédente si elle existe
        if (googleMapRef.current) {
          console.log("[GOOGLE MAPS] Réinitialisation de la carte précédente");
          googleMapRef.current = null;
        }
        
        // Vérifier que l'élément DOM existe bien et préparation du conteneur
        const mapElement = mapRef.current;
        
        console.log("[GOOGLE MAPS] Préparation du conteneur de carte:", mapElement);
        
        
        // Forcer le style inline pour s'assurer que le conteneur est visible
        mapElement.style.width = "100%";
        mapElement.style.height = "600px";
        mapElement.style.backgroundColor = "#f0f0f0"; // Fond visible pour débogage
        mapElement.style.position = "relative";
        mapElement.style.zIndex = "1";
        mapElement.style.display = "block";
        
        // Attendre avant de créer la carte
        setTimeout(() => {
          console.log("[GOOGLE MAPS] Tentative de création de la carte après délai");
        
          try {
            // Vérifier que Google Maps est disponible
            if (!window.google || !window.google.maps) {
              console.error("[GOOGLE MAPS] API Google Maps non disponible");
              setError("L'API Google Maps n'est pas disponible. Veuillez rafraîchir la page.");
              return;
            }

            // Vérifier à nouveau que le conteneur est disponible
            if (!mapRef.current) {
              console.error("[GOOGLE MAPS] Conteneur de carte non disponible après délai");
              return;
            }
            
            // Log des dimensions finales
            console.log("[GOOGLE MAPS] Dimensions finales du conteneur:", {
              offsetWidth: mapRef.current.offsetWidth,
              offsetHeight: mapRef.current.offsetHeight,
              clientWidth: mapRef.current.clientWidth,
              clientHeight: mapRef.current.clientHeight
            });
            
            // Création de la carte avec options minimales
            console.log("[GOOGLE MAPS] Création de l'objet carte...");
            const map = new window.google.maps.Map(mapRef.current, {
              center: { lat: 46.603354, lng: 1.888334 }, // Centre de la France
              zoom: 6,
              mapTypeId: google.maps.MapTypeId.ROADMAP,
              fullscreenControl: true,
              fullscreenControlOptions: {
                position: google.maps.ControlPosition.RIGHT_BOTTOM
              },
              zoomControl: true,
              zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_BOTTOM
              },
              streetViewControl: true,
              streetViewControlOptions: {
                position: google.maps.ControlPosition.RIGHT_BOTTOM
              },
              mapTypeControl: true,
              mapTypeControlOptions: {
                position: google.maps.ControlPosition.TOP_RIGHT,
                style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR
              }
            });
            
            // Assigner la référence à la carte
            console.log("[GOOGLE MAPS] Affectation de la référence à la carte");
            googleMapRef.current = map;
            
            // Ajouter les contrôles personnalisés
            addCustomControls(map);
            
            // Ajouter un marqueur test
            console.log("[GOOGLE MAPS] Ajout d'un marqueur test");
            const testMarker = new google.maps.Marker({
              position: { lat: 46.603354, lng: 1.888334 },
              map: map,
              title: "Centre de la France"
            });
            
            // Écouter l'événement de chargement complet
            google.maps.event.addListenerOnce(map, 'idle', () => {
              console.log("[GOOGLE MAPS] Événement idle déclenché - carte complètement chargée");
              setShouldRefreshMarkers(true);
            });
            
            // Forcer un rafraichissement de la carte
            setTimeout(() => {
              console.log("[GOOGLE MAPS] Forçage du redimensionnement de la carte");
              google.maps.event.trigger(map, 'resize');
              
              // Attendre encore un peu et vérifier l'état
              setTimeout(() => {
                console.log("[GOOGLE MAPS] Vérification finale de l'état de la carte");
                if (googleMapRef.current) {
                  console.log("[GOOGLE MAPS] La carte est bien initialisée");
                  // Forcer l'affichage des marqueurs
                  setShouldRefreshMarkers(true);
                } else {
                  console.error("[GOOGLE MAPS] La carte n'est toujours pas initialisée correctement");
                }
              }, 500);
            }, 200);
            
          } catch (err) {
            console.error("[GOOGLE MAPS] Erreur lors de la création de la carte:", err);
            setError(`Erreur lors de la création de la carte: ${err.message}`);
          }
        }, 500); // Délai réduit à 500ms pour un premier test
        
      } catch (err) {
        console.error("[GOOGLE MAPS] Erreur globale:", err);
        setError(`Erreur d'initialisation de la carte: ${err.message}`);
      }
    } else {
      if (!isGoogleMapsReady) {
        console.log("[GOOGLE MAPS] En attente de l'initialisation de l'API Google Maps");
      } else if (googleMapRef.current) {
        console.log("[GOOGLE MAPS] La carte est déjà initialisée, pas besoin de réinitialiser");
      } else if (!mapRef.current) {
        console.log("[GOOGLE MAPS] Conteneur de carte non disponible");
      }
    }
  }, [isGoogleMapsReady]);
  
  // Configurer un écouteur pour les changements dans les préférences de marqueurs
  useEffect(() => {
    if (isGoogleMapsReady) {
      try {
        console.log("Configuration de l'écouteur pour les préférences de marqueurs");
        const preferencesRef = collection(db, 'markerPreferences');
        const unsubscribe = onSnapshot(preferencesRef, (snapshot) => {
          const preferencesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as MarkerPreference[];
          
          console.log(`Mise à jour des préférences de marqueurs: ${preferencesData.length} préférences chargées`);
          setMapPreferences(preferencesData);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error("Erreur lors de la configuration de l'écouteur des préférences de marqueurs:", error);
        return () => {};
      }
    }
  }, [isGoogleMapsReady]);
  
  // Effet pour mettre à jour les marqueurs quand les filtres ou options changent
  useEffect(() => {
    if (googleMapRef.current && isGoogleMapsReady && sites.length > 0) {
      console.log("Mise à jour des marqueurs suite à un changement de filtre ou d'option");
      displayMarkers();
    }
  }, [visibleTypes, visiblePoles, showLabels, showGeneratedCoordinates, displayMarkers, googleMapRef.current, isGoogleMapsReady, sites.length]);
  
  // Fonction pour mettre à jour les marqueurs quand la carte ou les filtres changent
  useEffect(() => {
    if (googleMapRef.current) {
      displayMarkers();
    }
  }, [googleMapRef.current, sites, visibleTypes, visiblePoles, showGeneratedCoordinates, displayMarkers]);
  
  // Fonction pour ajouter des contrôles personnalisés à la carte
  const addCustomControls = (map: google.maps.Map) => {
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
      { name: 'Standard', styles: map.get('styles') || [] }, // Style actuel
      { name: 'Bleu', styles: [
        { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#cfe2f3" }] },
        { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#aaccee" }] }
      ]},
      { name: 'Clair', styles: [
        { "featureType": "all", "elementType": "all", "stylers": [{ "lightness": 50 }] },
        { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#f5f5f5" }] }
      ]},
      { name: 'Sombre', styles: [
        { "featureType": "all", "elementType": "all", "stylers": [{"lightness": -30}] },
        { "featureType": "road", "elementType": "geometry", "stylers": [{"lightness": 10}, {"color": "#444444"}] }
      ]}
    ];
    
    let currentStyleIndex = 0;
    
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
  };
  
  // Gérer le changement des types visibles
  const handleTypeToggle = (type: string) => {
    setVisibleTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };
  
  // Gérer le changement des pôles visibles
  const handlePoleToggle = (pole: string) => {
    console.log(`Toggle de visibilité pour le pôle: "${pole}"`);
    
    // Extraire le nom de base du pôle si nécessaire
    let poleBase = pole;
    const match = pole.toLowerCase().match(/\b(nord|sud|est|ouest|centre)\b/);
    if (match) {
      poleBase = match[0];
      console.log(`Utilisation du nom de base "${poleBase}" pour le filtrage au lieu de "${pole}"`);
    }
    
    setVisiblePoles(prev => {
      const newState = {
        ...prev,
        [poleBase]: !prev[poleBase]
      };
      console.log(`Nouvel état des filtres de pôles:`, newState);
      return newState;
    });
  };
  
  // Sélectionner ou désélectionner tous les types
  const handleSelectAllTypes = (select: boolean) => {
    const allTypes: Record<string, boolean> = {};
    Object.keys(visibleTypes).forEach(type => { allTypes[type] = select; });
    setVisibleTypes(allTypes);
  };
  
  // Sélectionner ou désélectionner tous les pôles
  const handleSelectAllPoles = (select: boolean) => {
    const allPoles: Record<string, boolean> = {};
    Object.keys(visiblePoles).forEach(pole => { allPoles[pole] = select; });
    setVisiblePoles(allPoles);
  };
  
  // Fonction pour zoomer sur un site
  const handleZoomToSite = (site: Site) => {
    if (!googleMapRef.current || !site.latitude || !site.longitude) return;
    
    // Assurez-vous que latitude et longitude sont des nombres
    const siteLat = typeof site.latitude === 'string' ? parseFloat(site.latitude) : site.latitude;
    const siteLng = typeof site.longitude === 'string' ? parseFloat(site.longitude) : site.longitude;
    
    googleMapRef.current.setCenter({ lat: siteLat, lng: siteLng });
    googleMapRef.current.setZoom(15);
    
    // Trouver le marqueur correspondant
    const marker = markersRef.current.find(m => {
      const pos = m.getPosition();
      return pos && 
            Math.abs(pos.lat() - siteLat) < 0.0001 && 
            Math.abs(pos.lng() - siteLng) < 0.0001;
    });
    
    if (marker) {
      // Fermer toutes les fenêtres d'info ouvertes
      infoWindowsRef.current.forEach(iw => iw.close());
      
      // Créer une nouvelle fenêtre d'info pour ce site
      const contentString = `
        <div class="info-window">
          <h3>${site.nom}</h3>
          <p><strong>Type:</strong> ${site.type || 'Non spécifié'}</p>
          <p><strong>Adresse:</strong> ${site.adresse || 'Non spécifiée'}</p>
          <p><strong>Téléphone:</strong> ${site.telephone || 'Non spécifié'}</p>
          ${site.pole ? `<p><strong>Pôle:</strong> ${site.pole}</p>` : ''}
          ${site.email ? `<p><strong>Email:</strong> ${site.email}</p>` : ''}
        </div>
      `;
      
      const infoWindow = new google.maps.InfoWindow({
        content: contentString,
        maxWidth: 300
      });
      
      // Ouvrir l'infowindow sur le marqueur
      infoWindow.open(googleMapRef.current, marker);
      
      // Ajouter à la liste des fenêtres ouvertes
      infoWindowsRef.current.push(infoWindow);
    }
  };
  
  // Réinitialiser les états au démontage
  useEffect(() => {
    return () => {
      // Nettoyer les références aux marqueurs, infobulles, etc.
      if (markersRef.current.length > 0) {
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
      }
      
      if (infoWindowsRef.current.length > 0) {
        infoWindowsRef.current.forEach(infoWindow => infoWindow.close());
        infoWindowsRef.current = [];
      }
      
      // Nettoyer les labels s'ils existent
      if (labelsRef.current.length > 0) {
        labelsRef.current.forEach(labelInfo => {
          labelInfo.overlay.setMap(null);
          if (labelInfo.element.parentNode) {
            labelInfo.element.parentNode.removeChild(labelInfo.element);
          }
        });
        labelsRef.current = [];
      }
    };
  }, []);
  
  // Fonction pour géocoder manuellement tous les sites
  const geocodeAllSites = async () => {
    try {
      setIsGeocoding(true);
      setGeocodingStatus('Préparation du géocodage...');
      
      // Filtrer les sites sans coordonnées
      const sitesWithoutCoordinates = sites.filter(site => 
        !site.latitude || !site.longitude
      );
      
      if (sitesWithoutCoordinates.length === 0) {
        setGeocodingStatus('Tous les sites ont déjà des coordonnées géographiques.');
        setTimeout(() => {
          setGeocodingStatus(null);
          setIsGeocoding(false);
        }, 3000);
        return;
      }
      
      setGeocodingStatus(`Géocodage de ${sitesWithoutCoordinates.length} sites...`);
      console.log(`Début du géocodage pour ${sitesWithoutCoordinates.length} sites`);
      
      // Géocoder les sites sans coordonnées
      const updatedSites = [...sites];
      let geocodedCount = 0;
      
      for (const site of sitesWithoutCoordinates) {
        if (site.adresse && (site.ville || site.codePostal)) {
          try {
            console.log(`Tentative de géocodage pour le site: ${site.nom}, Adresse: ${site.adresse}, ${site.codePostal} ${site.ville}`);
            
            const result = await geocodeAddress(
              site.nom || '',
              site.adresse || '',
              site.ville || '',
              site.codePostal || ''
            );
            
            if (result) {
              console.log(`Géocodage réussi pour ${site.nom}: Lat=${result.latitude}, Lon=${result.longitude}`);
              
              // Préparer les données à mettre à jour
              const updateData = {
                latitude: result.latitude,
                longitude: result.longitude
              };
              
              // Mettre à jour les données dans Firestore
              const siteRef = doc(db, 'sites', site.id);
              await updateDoc(siteRef, updateData);
              
              // Mettre à jour les données dans l'état local
              const index = updatedSites.findIndex(s => s.id === site.id);
              if (index !== -1) {
                updatedSites[index] = {
                  ...updatedSites[index],
                  ...updateData
                };
              }
              
              geocodedCount++;
              setGeocodingStatus(`Géocodage en cours... ${geocodedCount}/${sitesWithoutCoordinates.length}`);
            } else {
              console.log(`Échec du géocodage pour ${site.nom}`);
            }
          } catch (error) {
            console.error(`Erreur lors du géocodage du site ${site.nom}:`, error);
          }
          
          // Pause pour éviter de dépasser les limites de l'API
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log(`Site ${site.nom} sans adresse complète, géocodage impossible`);
        }
      }
      
      if (geocodedCount > 0) {
        console.log(`${geocodedCount} sites géocodés avec succès.`);
        setSites(updatedSites);
        setGeocodingStatus(`${geocodedCount} sites géocodés avec succès.`);
        
        // Mettre à jour le cache
        saveToCache('mapSitesCache', updatedSites);
        
        // Rafraîchir les marqueurs sur la carte
        setShouldRefreshMarkers(true);
      } else {
        setGeocodingStatus('Aucun site n\'a pu être géocodé. Vérifiez que les adresses sont complètes.');
      }
      
      // Masquer le statut après quelques secondes
      setTimeout(() => {
        setGeocodingStatus(null);
        setIsGeocoding(false);
      }, 5000);
    } catch (error) {
      console.error('Erreur lors du géocodage des sites:', error);
      setError('Erreur lors du géocodage des sites');
      setIsGeocoding(false);
    }
  };
  
  // Fonction pour récupérer les détails d'un lieu via Google Places API
  const getPlaceDetails = async (
    latitude: number, 
    longitude: number, 
    address: string,
    infoWindow: google.maps.InfoWindow,
    marker: google.maps.Marker,
    site: Site
  ) => {
    try {
      // S'assurer que l'API Google Maps est chargée
      await mapService.loadGoogleMapsAPI();
      
      // Vérifier si l'API Places est disponible
      if (!window.google || !window.google.maps || !window.google.maps.places || !window.google.maps.places.PlacesService) {
        console.error('API Google Places non disponible');
        return;
      }
      
      // Créer un service Places (nécessite un élément DOM ou une carte)
      const placesService = new window.google.maps.places.PlacesService(googleMapRef.current);
      
      // Déterminer le nom à utiliser pour la recherche
      // Si le type de site est "laboratoire" (ou variante), utiliser "Inovie Labosud" + nom du site
      let searchName = site.nom;
      if (site.type && normalizeType(site.type).includes('laboratoire')) {
        searchName = `Inovie Labosud ${site.nom}`;
      }
      
      // Construire la requête pour rechercher le lieu par proximité et adresse
      const request = {
        location: new google.maps.LatLng(latitude, longitude),
        radius: 100, // Rayon de recherche en mètres
        query: `${searchName} ${address}`,
        fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'opening_hours', 'rating', 'photos', 'place_id']
      };
      
      // Faire une recherche par texte pour trouver le lieu
      placesService.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          console.log('Lieu trouvé par recherche textuelle:', results[0]);
          
          // Utiliser le premier résultat trouvé
          const place = results[0];
          
          // Maintenant, récupérer les détails complets du lieu
          const detailsRequest = {
            placeId: place.place_id,
            fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'opening_hours', 'rating', 'photos']
          };
          
          placesService.getDetails(detailsRequest, (placeDetails, detailsStatus) => {
            if (detailsStatus === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
              console.log('Détails du lieu récupérés:', placeDetails);
              
              // Créer le contenu HTML enrichi
              updateInfoWindowContent(infoWindow, marker, site, placeDetails);
            } else {
              console.warn('Impossible de récupérer les détails du lieu:', detailsStatus);
              
              // Utiliser les informations partielles du résultat de recherche
              updateInfoWindowContent(infoWindow, marker, site, place);
            }
          });
        } else {
          console.warn('Lieu non trouvé:', status);
          // Garder l'infowindow basique si aucun lieu n'est trouvé
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du lieu:', error);
    }
  };
  
  // Fonction pour mettre à jour le contenu de l'infowindow avec les détails du lieu
  const updateInfoWindowContent = (
    infoWindow: google.maps.InfoWindow, 
    marker: google.maps.Marker, 
    site: Site,
    placeDetails: any
  ) => {
    // Formater les horaires d'ouverture s'ils sont disponibles
    let openingHoursHtml = '';
    if (placeDetails.opening_hours && placeDetails.opening_hours.weekday_text) {
      openingHoursHtml = `
        <div class="opening-hours">
          <strong>Horaires d'ouverture:</strong>
          <ul style="padding-left: 20px; margin: 5px 0;">
            ${placeDetails.opening_hours.weekday_text.map((day: string) => `<li>${day}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    // Formater le numéro de téléphone
    const phoneHtml = placeDetails.formatted_phone_number 
      ? `<p><strong>Téléphone:</strong> <a href="tel:${placeDetails.formatted_phone_number}">${placeDetails.formatted_phone_number}</a></p>` 
      : site.telephone 
        ? `<p><strong>Téléphone:</strong> <a href="tel:${site.telephone}">${site.telephone}</a></p>` 
        : '';
    
    // Formater le site web
    const websiteHtml = placeDetails.website 
      ? `<p><strong>Site web:</strong> <a href="${placeDetails.website}" target="_blank">${new URL(placeDetails.website).hostname}</a></p>` 
      : '';
    
    // Formater la note si disponible
    const ratingHtml = placeDetails.rating 
      ? `<p><strong>Note:</strong> ${placeDetails.rating} / 5</p>` 
      : '';
    
    // Adresse formatée de Google
    const addressHtml = placeDetails.formatted_address 
      ? `<p><strong>Adresse:</strong> ${placeDetails.formatted_address}</p>` 
      : site.adresse 
        ? `<p><strong>Adresse:</strong> ${site.adresse}${site.codePostal ? ', ' + site.codePostal : ''}${site.ville ? ' ' + site.ville : ''}</p>` 
        : '';
    
    // Photo si disponible
    let photoHtml = '';
    if (placeDetails.photos && placeDetails.photos.length > 0) {
      const photoUrl = placeDetails.photos[0].getUrl({maxWidth: 200, maxHeight: 200});
      photoHtml = `<div style="margin-top:10px;"><img src="${photoUrl}" alt="${site.nom}" style="width:100%; max-height:150px; object-fit:cover; border-radius:4px;"></div>`;
    }
    
    // Déterminer le nom à afficher
    let displayName = placeDetails.name || site.nom;
    // Si c'est un laboratoire et que le nom ne contient pas déjà "Inovie Labosud"
    if (site.type && normalizeType(site.type).includes('laboratoire') && !displayName.includes("Inovie Labosud")) {
      displayName = `Inovie Labosud ${displayName}`;
    }
    
    // Construire le contenu HTML complet
    const infoWindowContent = `
      <div class="info-window" style="max-width:300px; font-family:Arial,sans-serif;">
        <h3 style="margin-top:0;">${displayName}</h3>
        ${addressHtml}
        ${phoneHtml}
        ${websiteHtml}
        ${ratingHtml}
        <p><strong>Type:</strong> ${site.type || 'Non défini'}</p>
        ${openingHoursHtml}
        ${photoHtml}
        ${placeDetails.place_id ? `
          <p style="margin-top:10px; font-size:11px; text-align:right;">
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.nom)}&query_place_id=${placeDetails.place_id}" target="_blank">
              Voir sur Google Maps
            </a>
          </p>
        ` : ''}
      </div>
    `;
    
    // Mettre à jour le contenu de l'infowindow
    infoWindow.setContent(infoWindowContent);
    
    // Si l'infowindow est déjà ouverte, la rafraîchir
    infoWindow.open(googleMapRef.current, marker);
  };
  
  if (loading) {
    return (
      <div className="map-view-container">
        {/* Filtres au-dessus de la carte */}
        <div style={{ width: '100%', background: 'white', padding: '10px', borderRadius: '4px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
          <div className="filter-section" style={{ flex: '1', minWidth: '200px' }}>
            <h3>Types de sites {dataLoading.types && <small>(chargement...)</small>}</h3>
            <div className="filter-buttons">
              <button onClick={() => handleSelectAllTypes(true)}>Tous</button>
              <button onClick={() => handleSelectAllTypes(false)}>Aucun</button>
            </div>
            <div className="filter-options">
              {Object.keys(visibleTypes).length === 0 ? (
                <p style={{ fontSize: '12px', color: '#666' }}>Aucun type de site disponible</p>
              ) : (
                Object.keys(visibleTypes).map(type => (
                  <div key={type} className="filter-option">
                    <input
                      type="checkbox"
                      id={`type-${type}`}
                      checked={visibleTypes[type]}
                      onChange={() => handleTypeToggle(type)}
                    />
                    <label htmlFor={`type-${type}`}>{type}</label>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="filter-section" style={{ flex: '1', minWidth: '200px' }}>
            <h3>Pôles {dataLoading.poles && <small>(chargement...)</small>}</h3>
            <div className="filter-buttons">
              <button onClick={() => handleSelectAllPoles(true)}>Tous</button>
              <button onClick={() => handleSelectAllPoles(false)}>Aucun</button>
            </div>
            <div className="filter-options">
              {Object.keys(visiblePoles).length === 0 ? (
                <p style={{ fontSize: '12px', color: '#666' }}>Aucun pôle disponible</p>
              ) : (
                Object.keys(visiblePoles).map(pole => (
                  <div key={pole} className="filter-option">
                    <input
                      type="checkbox"
                      id={`pole-${pole}`}
                      checked={visiblePoles[pole]}
                      onChange={() => handlePoleToggle(pole)}
                    />
                    <label htmlFor={`pole-${pole}`}>{pole}</label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="filter-section" style={{ flex: '1', minWidth: '200px' }}>
            <h3>Options</h3>
            <div className="filter-options">
              <div className="filter-option">
                <input
                  type="checkbox"
                  id="show-labels"
                  checked={showLabels}
                  onChange={() => setShowLabels(!showLabels)}
                />
                <label htmlFor="show-labels">Afficher les labels</label>
              </div>
              <div className="filter-option">
                <input
                  type="checkbox"
                  id="show-generated"
                  checked={showGeneratedCoordinates}
                  onChange={() => setShowGeneratedCoordinates(!showGeneratedCoordinates)}
                />
                <label htmlFor="show-generated">Inclure coordonnées générées</label>
              </div>
              <div className="filter-option">
                <input
                  type="checkbox"
                  id="show-legend"
                  checked={showLegend}
                  onChange={() => setShowLegend(!showLegend)}
                />
                <label htmlFor="show-legend">Afficher la légende</label>
              </div>
            </div>
            
            {/* Bouton de géocodage */}
            <div className="filter-option" style={{ marginTop: '10px' }}>
              <button 
                onClick={geocodeAllSites}
                disabled={isGeocoding}
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: isGeocoding ? '#ccc' : '#4CAF50', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: isGeocoding ? 'not-allowed' : 'pointer',
                  width: '100%'
                }}
              >
                {isGeocoding ? 'Géocodage en cours...' : 'Géocoder tous les sites'}
              </button>
            </div>
            
            {/* Affichage du statut de géocodage */}
            {geocodingStatus && (
              <div className="geocoding-status" style={{ 
                marginTop: '5px', 
                padding: '5px',
                backgroundColor: '#f0f8ff', 
                borderRadius: '4px',
                fontSize: '12px',
                textAlign: 'center' 
              }}>
                {geocodingStatus}
              </div>
            )}
            
            {/* Statistiques sur les données */}
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
              <p>Sites: {sites.length} | Marqueurs: {markersRef.current.length}</p>
              <p>Types: {Object.keys(visibleTypes).length} | Pôles: {Object.keys(visiblePoles).length}</p>
            </div>
          </div>
        </div>

        <div id="map-main-container" style={{ width: '100%', height: '600px', position: 'relative' }}>
          {/* Carte Google Maps */}
          <div 
            ref={mapRef}
            id="google-map" 
            className="google-map" 
            style={{ 
              width: '100%', 
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
          ></div>
          
          {/* Légende */}
          {showLegend && (
            <div style={{ 
              position: 'absolute', 
              top: '10px', 
              left: '10px',
              zIndex: 10,
              background: 'white',
              padding: '10px',
              borderRadius: '4px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              maxWidth: '250px',
              maxHeight: '500px',
              overflowY: 'auto'
            }}>
              <h3>Légende</h3>
              <div>
                <h4>Types de sites</h4>
                {mapPreferences.map(pref => {
                  // Déterminer le SVG à afficher en fonction de l'aperçu
                  const markerShape = pref.apercu || pref.icon || 'circle';
                  const formeName = markerShape.toLowerCase();
                  
                  let svgIcon = '';
                  
                  switch (formeName) {
                    case 'pin':
                    case 'épingle':
                      svgIcon = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="16" height="24">
                          <path fill="${pref.color}" stroke="#FFFFFF" stroke-width="2" d="M12,0 C5.4,0 0,5.4 0,12 C0,18.2 10.4,34.2 10.8,34.8 C11.1,35.3 11.9,35.3 12.2,34.8 C12.6,34.2 24,17 24,12 C24,5.4 18.6,0 12,0 Z"/>
                          <circle cx="12" cy="12" r="4" fill="#FFFFFF" opacity="0.8"/>
                        </svg>
                      `;
                      break;
                    case 'droplet':
                    case 'goutte':
                      svgIcon = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="16" height="24">
                          <path fill="${pref.color}" stroke="#FFFFFF" stroke-width="2" d="M12,0 C12,0 0,16 0,24 C0,28.4 5.4,32 12,32 C18.6,32 24,28.4 24,24 C24,16 12,0 12,0 Z"/>
                        </svg>
                      `;
                      break;
                    case 'circle':
                    case 'cercle':
                      svgIcon = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                          <circle cx="10" cy="10" r="8" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                        </svg>
                      `;
                      break;
                    case 'square':
                    case 'carré':
                      svgIcon = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                          <rect x="2" y="2" width="16" height="16" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                        </svg>
                      `;
                      break;
                    case 'triangle':
                      svgIcon = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                          <polygon points="10,2 18,18 2,18" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                        </svg>
                      `;
                      break;
                    case 'diamond':
                    case 'diamant':
                      svgIcon = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                          <polygon points="10,2 18,10 10,18 2,10" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                        </svg>
                      `;
                      break;
                    case 'hexagon':
                    case 'hexagone':
                      svgIcon = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                          <polygon points="17,10 14,17 6,17 3,10 6,3 14,3" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                        </svg>
                      `;
                      break;
                    case 'star':
                    case 'étoile':
                      svgIcon = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                          <polygon points="10,2 12.2,7.8 18,8.4 13.6,12.4 14.6,18 10,15 5.4,18 6.4,12.4 2,8.4 7.8,7.8" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                        </svg>
                      `;
                      break;
                    case 'cross':
                    case 'croix':
                      svgIcon = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                          <path d="M7,2 L13,2 L13,7 L18,7 L18,13 L13,13 L13,18 L7,18 L7,13 L2,13 L2,7 L7,7 Z" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                        </svg>
                      `;
                      break;
                    default:
                      svgIcon = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                          <circle cx="10" cy="10" r="8" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                        </svg>
                      `;
                  }
                  
                  // Encoder le SVG pour l'affichage
                  const encodedSvg = encodeURIComponent(svgIcon);
                  const dataUri = `data:image/svg+xml,${encodedSvg}`;
                  
                  return (
                    <div key={pref.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <img 
                        src={dataUri} 
                        alt={pref.name} 
                        style={{ 
                          marginRight: '10px',
                          width: formeName.includes('pin') ? '15px' : '15px',
                          height: formeName.includes('pin') ? '20px' : '15px'
                        }} 
                      />
                      <span>{pref.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Bouton de rafraîchissement du cache */}
          <button 
            className="refresh-cache-button"
            onClick={() => refreshCache()}
            title="Efface le cache et recharge toutes les données fraîches depuis Firestore"
          >
            Rafraîchir les données
          </button>
          
          {/* Indicateur d'état */}
          <div style={{ 
            position: 'absolute', 
            bottom: '10px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.8)',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 5
          }}>
            {loading || dataLoading.sites || dataLoading.preferences ? 
              "Chargement des données..." : 
              `${markersRef.current.length} marqueurs affichés`
            }
          </div>
          
          {/* Chargement */}
          {(loading || Object.values(dataLoading).some(val => val)) && (
            <div className="loading-overlay">
              <div>
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  {loading ? "Chargement de la carte..." : "Mise à jour des données..."}
                </div>
                <div className="loading-spinner"></div>
              </div>
            </div>
          )}
          
          {/* Erreur */}
          {error && (
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: 'rgba(255,255,255,0.9)', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              zIndex: 20
            }}>
              <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>
                <button 
                  onClick={() => window.location.reload()} 
                  style={{ padding: '8px 16px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Recharger la page
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="map-view-container">
      {/* Filtres au-dessus de la carte */}
      <div style={{ width: '100%', background: 'white', padding: '10px', borderRadius: '4px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
        <div className="filter-section" style={{ flex: '1', minWidth: '200px' }}>
          <h3>Types de sites {dataLoading.types && <small>(chargement...)</small>}</h3>
          <div className="filter-buttons">
            <button onClick={() => handleSelectAllTypes(true)}>Tous</button>
            <button onClick={() => handleSelectAllTypes(false)}>Aucun</button>
          </div>
          <div className="filter-options">
            {Object.keys(visibleTypes).length === 0 ? (
              <p style={{ fontSize: '12px', color: '#666' }}>Aucun type de site disponible</p>
            ) : (
              Object.keys(visibleTypes).map(type => (
                <div key={type} className="filter-option">
                  <input
                    type="checkbox"
                    id={`type-${type}`}
                    checked={visibleTypes[type]}
                    onChange={() => handleTypeToggle(type)}
                  />
                  <label htmlFor={`type-${type}`}>{type}</label>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="filter-section" style={{ flex: '1', minWidth: '200px' }}>
          <h3>Pôles {dataLoading.poles && <small>(chargement...)</small>}</h3>
          <div className="filter-buttons">
            <button onClick={() => handleSelectAllPoles(true)}>Tous</button>
            <button onClick={() => handleSelectAllPoles(false)}>Aucun</button>
          </div>
          <div className="filter-options">
            {Object.keys(visiblePoles).length === 0 ? (
              <p style={{ fontSize: '12px', color: '#666' }}>Aucun pôle disponible</p>
            ) : (
              Object.keys(visiblePoles).map(pole => (
                <div key={pole} className="filter-option">
                  <input
                    type="checkbox"
                    id={`pole-${pole}`}
                    checked={visiblePoles[pole]}
                    onChange={() => handlePoleToggle(pole)}
                  />
                  <label htmlFor={`pole-${pole}`}>{pole}</label>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="filter-section" style={{ flex: '1', minWidth: '200px' }}>
          <h3>Options</h3>
          <div className="filter-options">
            <div className="filter-option">
              <input
                type="checkbox"
                id="show-labels"
                checked={showLabels}
                onChange={() => setShowLabels(!showLabels)}
              />
              <label htmlFor="show-labels">Afficher les labels</label>
            </div>
            <div className="filter-option">
              <input
                type="checkbox"
                id="show-generated"
                checked={showGeneratedCoordinates}
                onChange={() => setShowGeneratedCoordinates(!showGeneratedCoordinates)}
              />
              <label htmlFor="show-generated">Inclure coordonnées générées</label>
            </div>
            <div className="filter-option">
              <input
                type="checkbox"
                id="show-legend"
                checked={showLegend}
                onChange={() => setShowLegend(!showLegend)}
              />
              <label htmlFor="show-legend">Afficher la légende</label>
            </div>
          </div>
          
          {/* Bouton de géocodage */}
          <div className="filter-option" style={{ marginTop: '10px' }}>
            <button 
              onClick={geocodeAllSites}
              disabled={isGeocoding}
              style={{ 
                padding: '6px 12px', 
                backgroundColor: isGeocoding ? '#ccc' : '#4CAF50', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: isGeocoding ? 'not-allowed' : 'pointer',
                width: '100%'
              }}
            >
              {isGeocoding ? 'Géocodage en cours...' : 'Géocoder tous les sites'}
            </button>
          </div>
          
          {/* Affichage du statut de géocodage */}
          {geocodingStatus && (
            <div className="geocoding-status" style={{ 
              marginTop: '5px', 
              padding: '5px',
              backgroundColor: '#f0f8ff', 
              borderRadius: '4px',
              fontSize: '12px',
              textAlign: 'center' 
            }}>
              {geocodingStatus}
            </div>
          )}
          
          {/* Statistiques sur les données */}
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            <p>Sites: {sites.length} | Marqueurs: {markersRef.current.length}</p>
            <p>Types: {Object.keys(visibleTypes).length} | Pôles: {Object.keys(visiblePoles).length}</p>
          </div>
        </div>
      </div>

      <div id="map-main-container" style={{ width: '100%', height: '600px', position: 'relative' }}>
        {/* Carte Google Maps */}
        <div 
          ref={mapRef}
          id="google-map" 
          className="google-map" 
          style={{ 
            width: '100%', 
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        ></div>
        
        {/* Légende */}
        {showLegend && (
          <div style={{ 
            position: 'absolute', 
            top: '10px', 
            left: '10px',
            zIndex: 10,
            background: 'white',
            padding: '10px',
            borderRadius: '4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            maxWidth: '250px',
            maxHeight: '500px',
            overflowY: 'auto'
          }}>
            <h3>Légende</h3>
            <div>
              <h4>Types de sites</h4>
              {mapPreferences.map(pref => {
                // Déterminer le SVG à afficher en fonction de l'aperçu
                const markerShape = pref.apercu || pref.icon || 'circle';
                const formeName = markerShape.toLowerCase();
                
                let svgIcon = '';
                
                switch (formeName) {
                  case 'pin':
                  case 'épingle':
                    svgIcon = `
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="16" height="24">
                        <path fill="${pref.color}" stroke="#FFFFFF" stroke-width="2" d="M12,0 C5.4,0 0,5.4 0,12 C0,18.2 10.4,34.2 10.8,34.8 C11.1,35.3 11.9,35.3 12.2,34.8 C12.6,34.2 24,17 24,12 C24,5.4 18.6,0 12,0 Z"/>
                        <circle cx="12" cy="12" r="4" fill="#FFFFFF" opacity="0.8"/>
                      </svg>
                    `;
                    break;
                  case 'droplet':
                  case 'goutte':
                    svgIcon = `
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="16" height="24">
                        <path fill="${pref.color}" stroke="#FFFFFF" stroke-width="2" d="M12,0 C12,0 0,16 0,24 C0,28.4 5.4,32 12,32 C18.6,32 24,28.4 24,24 C24,16 12,0 12,0 Z"/>
                      </svg>
                    `;
                    break;
                  case 'circle':
                  case 'cercle':
                    svgIcon = `
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                        <circle cx="10" cy="10" r="8" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                      </svg>
                    `;
                    break;
                  case 'square':
                  case 'carré':
                    svgIcon = `
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                        <rect x="2" y="2" width="16" height="16" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                      </svg>
                    `;
                    break;
                  case 'triangle':
                    svgIcon = `
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                        <polygon points="10,2 18,18 2,18" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                      </svg>
                    `;
                    break;
                  case 'diamond':
                  case 'diamant':
                    svgIcon = `
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                        <polygon points="10,2 18,10 10,18 2,10" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                      </svg>
                    `;
                    break;
                  case 'hexagon':
                  case 'hexagone':
                    svgIcon = `
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                        <polygon points="17,10 14,17 6,17 3,10 6,3 14,3" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                      </svg>
                    `;
                    break;
                  case 'star':
                  case 'étoile':
                    svgIcon = `
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                        <polygon points="10,2 12.2,7.8 18,8.4 13.6,12.4 14.6,18 10,15 5.4,18 6.4,12.4 2,8.4 7.8,7.8" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                      </svg>
                    `;
                    break;
                  case 'cross':
                  case 'croix':
                    svgIcon = `
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                        <path d="M7,2 L13,2 L13,7 L18,7 L18,13 L13,13 L13,18 L7,18 L7,13 L2,13 L2,7 L7,7 Z" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                      </svg>
                    `;
                    break;
                  default:
                    svgIcon = `
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="16" height="16">
                        <circle cx="10" cy="10" r="8" fill="${pref.color}" stroke="#FFFFFF" stroke-width="2"/>
                      </svg>
                    `;
                }
                
                // Encoder le SVG pour l'affichage
                const encodedSvg = encodeURIComponent(svgIcon);
                const dataUri = `data:image/svg+xml,${encodedSvg}`;
                
                return (
                  <div key={pref.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <img 
                      src={dataUri} 
                      alt={pref.name} 
                      style={{ 
                        marginRight: '10px',
                        width: formeName.includes('pin') ? '15px' : '15px',
                        height: formeName.includes('pin') ? '20px' : '15px'
                      }} 
                    />
                    <span>{pref.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Bouton de rafraîchissement du cache */}
        <button 
          className="refresh-cache-button"
          onClick={() => refreshCache()}
          title="Efface le cache et recharge toutes les données fraîches depuis Firestore"
        >
          Rafraîchir les données
        </button>
        
        {/* Indicateur d'état */}
        <div style={{ 
          position: 'absolute', 
          bottom: '10px', 
          left: '50%', 
          transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.8)',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 5
        }}>
          {loading || dataLoading.sites || dataLoading.preferences ? 
            "Chargement des données..." : 
            `${markersRef.current.length} marqueurs affichés`
          }
        </div>
        
        {/* Chargement */}
        {(loading || Object.values(dataLoading).some(val => val)) && (
          <div className="loading-overlay">
            <div>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                {loading ? "Chargement de la carte..." : "Mise à jour des données..."}
              </div>
              <div className="loading-spinner"></div>
            </div>
          </div>
        )}
        
        {/* Erreur */}
        {error && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(255,255,255,0.9)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            zIndex: 20
          }}>
            <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>
              <button 
                onClick={() => window.location.reload()} 
                style={{ padding: '8px 16px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Recharger la page
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView; 



