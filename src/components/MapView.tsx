import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, onSnapshot, Timestamp, updateDoc, doc, getDoc } from 
'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup, LayerGroup, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geocodeAddress } from '../utils/geocoding';
import './MapView.css';
import 'leaflet.markercluster';
import './MarkerCluster.css';
import './MarkerCluster.Default.css';
import { MarkerPreference } from '../types';
// Renommer les imports pour éviter les conflits avec les interfaces locales
// import { Site, Tournee, MarkerPreference } from '../types';

// Fix pour les icônes Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Correction pour les icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Définir des icônes spécifiques
const siteIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const departIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const arrivalIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Définir des icônes spécifiques pour chaque type de site
const laboratoireIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'site-icon site-icon-laboratoire'
});

const cliniqueIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'site-icon site-icon-clinique'
});

const plateauIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'site-icon site-icon-plateau'
});

const collecteIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'site-icon site-icon-collecte'
});

const etablissementIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'site-icon site-icon-etablissement'
});

const ehpadIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'site-icon site-icon-ehpad'
});

const veterinaireIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'site-icon site-icon-veterinaire'
});

// Types de sites disponibles
const SITE_TYPES = [
  'Laboratoire',
  'Clinique',
  'Plateau technique',
  'Point de collecte',
  'Etablissement de sant�',
  'Ehpad',
  'V�t�rinaire'
];

// P�les disponibles
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
  
  // Normaliser les types courants avec des correspondances plus pr�cises
  const typeMap: { [key: string]: string } = {
    'labo': 'laboratoire',
    'laboratoire': 'laboratoire',
    'plateau': 'plateau technique',
    'plateau technique': 'plateau technique',
    'clinique': 'clinique',
    'collect': 'point de collecte',
    'point de collecte': 'point de collecte',
    'etablissement': 'etablissement de sant�',
    '�tablissement': 'etablissement de sant�',
    'etablissement de sant�': 'etablissement de sant�',
    '�tablissement de sant�': 'etablissement de sant�',
    'ehpad': 'ehpad',
    'veterinaire': 'veterinaire',
    'v�t�rinaire': 'veterinaire'
  };
  
  // Recherche de correspondance exacte ou partielle
  for (const [key, value] of Object.entries(typeMap)) {
    if (normalized === key || normalized.includes(key)) {
      return value;
    }
  }
  
  return normalized;
};

// Fonction pour obtenir l'ic�ne par d�faut en fonction du type de site
const getDefaultIconForSiteType = (type: string | undefined): L.Icon => {
  if (!type) return siteIcon;
  
  // Normaliser le type pour la comparaison
  const normalizedType = normalizeType(type);
  
  // Retourner l'ic�ne correspondante
  if (normalizedType === 'laboratoire') {
    return laboratoireIcon;
  } else if (normalizedType === 'clinique') {
    return cliniqueIcon;
  } else if (normalizedType === 'plateau technique') {
    return plateauIcon;
  } else if (normalizedType === 'point de collecte') {
    return collecteIcon;
  } else if (normalizedType === 'etablissement de sant�') {
    return etablissementIcon;
  } else if (normalizedType === 'ehpad') {
    return ehpadIcon;
  } else if (normalizedType === 'veterinaire') {
    return veterinaireIcon;
  }
  
  // Par d�faut, retourner l'ic�ne g�n�rique
  return siteIcon;
};

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
  isArrival: boolean; // Indique si le coursier est � l'arriv�e ou au d�part
}

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
}

interface Tournee {
  id: string;
  nom: string;
}

// Composant pour ajouter le contr�le plein �cran personnalis�
const FullscreenControl: React.FC = () => {
  const map = useMap();
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  useEffect(() => {
    // Cr�er un contr�le personnalis�
    const FullscreenControl = L.Control.extend({
      options: {
        position: 'topleft'
      },
      
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const button = L.DomUtil.create('a', 'leaflet-control-fullscreen', container);
        
        button.innerHTML = '<i class="fas fa-expand"></i>'; // Utiliser une ic�ne FontAwesome
        button.href = '#';
        button.title = 'Afficher en plein �cran';
        button.setAttribute('role', 'button');
        button.setAttribute('aria-label', 'Afficher en plein �cran');
        
        L.DomEvent.on(button, 'click', function(e) {
          L.DomEvent.preventDefault(e);
          
          const mapContainer = map.getContainer();
          
          if (!document.fullscreenElement) {
            if (mapContainer.requestFullscreen) {
              mapContainer.requestFullscreen();
              button.innerHTML = '<i class="fas fa-compress"></i>'; // Ic�ne de r�duction
              button.title = 'Quitter le plein �cran';
              setIsFullscreen(true);
            }
          } else {
            if (document.exitFullscreen) {
              document.exitFullscreen();
              button.innerHTML = '<i class="fas fa-expand"></i>'; // Ic�ne d'agrandissement
              button.title = 'Afficher en plein �cran';
              setIsFullscreen(false);
            }
          }
        });
        
        // �couter les changements d'�tat du plein �cran
        const handleFullscreenChange = () => {
          if (!document.fullscreenElement && isFullscreen) {
            button.innerHTML = '<i class="fas fa-expand"></i>';
            button.title = 'Afficher en plein �cran';
            setIsFullscreen(false);
          }
        };
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        
        return container;
      }
    });
    
    // Ajouter le contr�le � la carte
    const fullscreenControl = new FullscreenControl();
    map.addControl(fullscreenControl);
    
    return () => {
      map.removeControl(fullscreenControl);
      document.removeEventListener('fullscreenchange', () => {});
    };
  }, [map, isFullscreen]);
  
  return null;
};

// Composant pour afficher tous les sites
const AllSitesLayer: React.FC<{
  sites: Site[];
  icon: L.Icon;
  getIconForSiteType: (type: string) => L.Icon;
  showLabels: boolean;
  showGeneratedCoordinates: boolean;
}> = ({ sites, icon, getIconForSiteType, showLabels, showGeneratedCoordinates }) => {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    // Cr�er un nouveau LayerGroup si n�cessaire
    if (!layerRef.current) {
      layerRef.current = L.layerGroup();
      
      // Ajouter le LayerGroup �  la carte si la couche est visible
      if (isVisible) {
        layerRef.current.addTo(map);
      }
    } else {
      // Sinon, vider le LayerGroup existant
      layerRef.current.clearLayers();
      
      // Ajouter ou retirer le LayerGroup de la carte selon la visibilit�
      if (isVisible && !map.hasLayer(layerRef.current)) {
        map.addLayer(layerRef.current);
      } else if (!isVisible && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
    }
    
    // Ajouter les marqueurs au LayerGroup seulement si la couche est visible
    if (isVisible) {
      sites.forEach(site => {
        // V�rifier si les coordonn�es sont g�n�r�es
        const isGeneratedCoords = site.hasOwnProperty('isGeneratedCoordinates') && 
                                (site as any).isGeneratedCoordinates === true;
        
        if (!showGeneratedCoordinates && isGeneratedCoords) {
          return;
        }
        
        if (site.latitude && site.longitude) {
          const siteIcon = getIconForSiteType(site.type || '');
          const marker = L.marker([site.latitude, site.longitude], { icon: siteIcon })
            .bindPopup(`
              <div class="site-popup">
                <h3>${site.nom}</h3>
                <p><strong>Type:</strong> ${site.type}</p>
                <p><strong>Adresse:</strong> ${site.adresse}</p>
                <p><strong>P�le:</strong> ${site.pole || 'Non d�fini'}</p>
                ${isGeneratedCoords ? '<p class="warning">Coordonn�es g�n�r�es automatiquement</p>' : 
''}
              </div>
            `);
          
          if (showLabels) {
            marker.bindTooltip(site.nom, { permanent: true, direction: 'top', className: 'site-label' });
          }
          
          layerRef.current?.addLayer(marker);
        }
      });
    }
    
    // Nettoyer le LayerGroup lors du d�montage du composant
    return () => {
      if (layerRef.current) {
        if (map.hasLayer(layerRef.current)) {
          map.removeLayer(layerRef.current);
        }
        layerRef.current = null;
      }
    };
  }, [sites, icon, getIconForSiteType, showLabels, showGeneratedCoordinates, map, isVisible]);
  
  // G�rer l'affichage/masquage de la couche en fonction du contr�le des couches
  useEffect(() => {
    const handleLayerControlChange = () => {
      const layersControl = document.querySelector('.leaflet-control-layers');
      if (layersControl) {
        const checkboxes = layersControl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          if ((checkbox as HTMLInputElement).nextSibling?.textContent?.trim() === 'Tous les sites') {
            // Mettre �  jour l'�tat de visibilit� en fonction de la case �  cocher
            setIsVisible((checkbox as HTMLInputElement).checked);
            
            // Ajouter un �couteur d'�v�nements pour les changements futurs
            (checkbox as HTMLInputElement).addEventListener('change', (e) => {
              const isChecked = (e.target as HTMLInputElement).checked;
              setIsVisible(isChecked);
            });
          }
        });
      }
    };
    
    // Attendre que le contr�le des couches soit ajout�  la carte
    const checkLayersControl = () => {
      const layersControl = document.querySelector('.leaflet-control-layers');
      if (layersControl) {
        handleLayerControlChange();
      } else {
        // Si le contr�le n'est pas encore disponible, r�essayer plus tard
        setTimeout(checkLayersControl, 100);
      }
    };
    
    checkLayersControl();
    
    // Nettoyer les �couteurs d'�v�nements lors du d�montage du composant
    return () => {
      const layersControl = document.querySelector('.leaflet-control-layers');
      if (layersControl) {
        const checkboxes = layersControl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          if ((checkbox as HTMLInputElement).nextSibling?.textContent?.trim() === 'Tous les sites') {
            (checkbox as HTMLInputElement).removeEventListener('change', () => {});
          }
        });
      }
    };
  }, [map]);
  
  return null;
};

// Composant pour afficher les sites par type
const SiteTypeLayer: React.FC<{
  sites: Site[];
  icon: L.Icon;
  type: string;
  getIconForSiteType: (type: string) => L.Icon;
  showLabels: boolean;
  showGeneratedCoordinates: boolean;
}> = ({ sites, icon, type, getIconForSiteType, showLabels, showGeneratedCoordinates }) => {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    // Cr�er un nouveau LayerGroup si n�cessaire
    if (!layerRef.current) {
      layerRef.current = L.layerGroup();
      
      // Ajouter le LayerGroup �  la carte si la couche est visible
      if (isVisible) {
        layerRef.current.addTo(map);
      }
    } else {
      // Sinon, vider le LayerGroup existant
      layerRef.current.clearLayers();
      
      // Ajouter ou retirer le LayerGroup de la carte selon la visibilit�
      if (isVisible && !map.hasLayer(layerRef.current)) {
        map.addLayer(layerRef.current);
      } else if (!isVisible && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
    }
    
    // Ajouter les marqueurs au LayerGroup seulement si la couche est visible
    if (isVisible) {
      // Filtrer les sites par type et ajouter les marqueurs au LayerGroup
      const filteredSites = sites.filter(site => normalizeType(site.type || '') === normalizeType(type));
      
      filteredSites.forEach(site => {
        // V�rifier si les coordonn�es sont g�n�r�es
        const isGeneratedCoords = site.hasOwnProperty('isGeneratedCoordinates') && 
                                (site as any).isGeneratedCoordinates === true;
        
        if (!showGeneratedCoordinates && isGeneratedCoords) {
          return;
        }
        
        if (site.latitude && site.longitude) {
          const siteIcon = getIconForSiteType(site.type || '');
          const marker = L.marker([site.latitude, site.longitude], { icon: siteIcon })
            .bindPopup(`
              <div class="site-popup">
                <h3>${site.nom}</h3>
                <p><strong>Type:</strong> ${site.type}</p>
                <p><strong>Adresse:</strong> ${site.adresse}</p>
                <p><strong>P�le:</strong> ${site.pole || 'Non d�fini'}</p>
                ${isGeneratedCoords ? '<p class="warning">Coordonn�es g�n�r�es automatiquement</p>' : 
''}
              </div>
            `);
          
          if (showLabels) {
            marker.bindTooltip(site.nom, { permanent: true, direction: 'top', className: 'site-label' });
          }
          
          layerRef.current?.addLayer(marker);
        }
      });
    }
    
    // Nettoyer le LayerGroup lors du d�montage du composant
    return () => {
      if (layerRef.current) {
        if (map.hasLayer(layerRef.current)) {
          map.removeLayer(layerRef.current);
        }
        layerRef.current = null;
      }
    };
  }, [sites, icon, type, getIconForSiteType, showLabels, showGeneratedCoordinates, map, isVisible]);
  
  // G�rer l'affichage/masquage de la couche en fonction du contr�le des couches
  useEffect(() => {
    const handleLayerControlChange = () => {
      const layersControl = document.querySelector('.leaflet-control-layers');
      if (layersControl) {
        const checkboxes = layersControl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          if ((checkbox as HTMLInputElement).nextSibling?.textContent?.trim() === type) {
            // Mettre �  jour l'�tat de visibilit� en fonction de la case �  cocher
            setIsVisible((checkbox as HTMLInputElement).checked);
            
            // Ajouter un �couteur d'�v�nements pour les changements futurs
            (checkbox as HTMLInputElement).addEventListener('change', (e) => {
              const isChecked = (e.target as HTMLInputElement).checked;
              setIsVisible(isChecked);
            });
          }
        });
      }
    };
    
    // Attendre que le contr�le des couches soit ajout�  la carte
    const checkLayersControl = () => {
      const layersControl = document.querySelector('.leaflet-control-layers');
      if (layersControl) {
        handleLayerControlChange();
      } else {
        // Si le contr�le n'est pas encore disponible, r�essayer plus tard
        setTimeout(checkLayersControl, 100);
      }
    };
    
    checkLayersControl();
    
    // Nettoyer les �couteurs d'�v�nements lors du d�montage du composant
    return () => {
      const layersControl = document.querySelector('.leaflet-control-layers');
      if (layersControl) {
        const checkboxes = layersControl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          if ((checkbox as HTMLInputElement).nextSibling?.textContent?.trim() === type) {
            (checkbox as HTMLInputElement).removeEventListener('change', () => {});
          }
        });
      }
    };
  }, [map, type]);
  
  return null;
};

// Composant pour afficher les sites par p�le
const PoleLayer: React.FC<{
  sites: Site[];
  icon: L.Icon;
  pole: string;
  getIconForSiteType: (type: string) => L.Icon;
  showLabels: boolean;
  showGeneratedCoordinates: boolean;
}> = ({ sites, icon, pole, getIconForSiteType, showLabels, showGeneratedCoordinates }) => {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    // Cr�er un nouveau LayerGroup si n�cessaire
    if (!layerRef.current) {
      layerRef.current = L.layerGroup();
      
      // Ajouter le LayerGroup �  la carte si la couche est visible
      if (isVisible) {
        layerRef.current.addTo(map);
      }
    } else {
      // Sinon, vider le LayerGroup existant
      layerRef.current.clearLayers();
      
      // Ajouter ou retirer le LayerGroup de la carte selon la visibilit�
      if (isVisible && !map.hasLayer(layerRef.current)) {
        map.addLayer(layerRef.current);
      } else if (!isVisible && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
    }
    
    // Ajouter les marqueurs au LayerGroup seulement si la couche est visible
    if (isVisible) {
      // Filtrer les sites par p�le et ajouter les marqueurs au LayerGroup
      const filteredSites = sites.filter(site => site.pole === pole);
      
      filteredSites.forEach(site => {
        // V�rifier si les coordonn�es sont g�n�r�es
        const isGeneratedCoords = site.hasOwnProperty('isGeneratedCoordinates') && 
                                (site as any).isGeneratedCoordinates === true;
        
        if (!showGeneratedCoordinates && isGeneratedCoords) {
          return;
        }
        
        if (site.latitude && site.longitude) {
          const siteIcon = getIconForSiteType(site.type || '');
          const marker = L.marker([site.latitude, site.longitude], { icon: siteIcon })
            .bindPopup(`
              <div class="site-popup">
                <h3>${site.nom}</h3>
                <p><strong>Type:</strong> ${site.type}</p>
                <p><strong>Adresse:</strong> ${site.adresse}</p>
                <p><strong>P�le:</strong> ${site.pole || 'Non d�fini'}</p>
                ${isGeneratedCoords ? '<p class="warning">Coordonn�es g�n�r�es automatiquement</p>' : 
''}
              </div>
            `);
          
          if (showLabels) {
            marker.bindTooltip(site.nom, { permanent: true, direction: 'top', className: 'site-label' });
          }
          
          layerRef.current?.addLayer(marker);
        }
      });
    }
    
    // Nettoyer le LayerGroup lors du d�montage du composant
    return () => {
      if (layerRef.current) {
        if (map.hasLayer(layerRef.current)) {
          map.removeLayer(layerRef.current);
        }
        layerRef.current = null;
      }
    };
  }, [sites, icon, pole, getIconForSiteType, showLabels, showGeneratedCoordinates, map, isVisible]);
  
  // G�rer l'affichage/masquage de la couche en fonction du contr�le des couches
  useEffect(() => {
    const handleLayerControlChange = () => {
      const layersControl = document.querySelector('.leaflet-control-layers');
      if (layersControl) {
        const checkboxes = layersControl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          if ((checkbox as HTMLInputElement).nextSibling?.textContent?.trim() === `P�le ${pole}`) {
            // Mettre �  jour l'�tat de visibilit� en fonction de la case �  cocher
            setIsVisible((checkbox as HTMLInputElement).checked);
            
            // Ajouter un �couteur d'�v�nements pour les changements futurs
            (checkbox as HTMLInputElement).addEventListener('change', (e) => {
              const isChecked = (e.target as HTMLInputElement).checked;
              setIsVisible(isChecked);
            });
          }
        });
      }
    };
    
    // Attendre que le contr�le des couches soit ajout�  la carte
    const checkLayersControl = () => {
      const layersControl = document.querySelector('.leaflet-control-layers');
      if (layersControl) {
        handleLayerControlChange();
      } else {
        // Si le contr�le n'est pas encore disponible, r�essayer plus tard
        setTimeout(checkLayersControl, 100);
      }
    };
    
    checkLayersControl();
    
    // Nettoyer les �couteurs d'�v�nements lors du d�montage du composant
    return () => {
      const layersControl = document.querySelector('.leaflet-control-layers');
      if (layersControl) {
        const checkboxes = layersControl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          if ((checkbox as HTMLInputElement).nextSibling?.textContent?.trim() === `P�le ${pole}`) {
            (checkbox as HTMLInputElement).removeEventListener('change', () => {});
          }
        });
      }
    };
  }, [map, pole]);
  
  return null;
};

// Composant pour afficher les coursiers
const CouriersLayer: React.FC<{
  courierLocations: CourierLocation[];
  departIcon: L.Icon;
  arrivalIcon: L.Icon;
  formatDate: (date: any) => string;
}> = ({ courierLocations, departIcon, arrivalIcon, formatDate }) => {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    // Cr�er un nouveau LayerGroup si n�cessaire
    if (!layerRef.current) {
      layerRef.current = L.layerGroup();
      
      // Ajouter le LayerGroup �  la carte si la couche est visible
      if (isVisible) {
        layerRef.current.addTo(map);
      }
    } else {
      // Sinon, vider le LayerGroup existant
      layerRef.current.clearLayers();
      
      // Ajouter ou retirer le LayerGroup de la carte selon la visibilit�
      if (isVisible && !map.hasLayer(layerRef.current)) {
        map.addLayer(layerRef.current);
      } else if (!isVisible && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
    }
    
    // Ajouter les marqueurs des coursiers au LayerGroup seulement si la couche est visible
    if (isVisible) {
      courierLocations.forEach(courier => {
        const icon = courier.isArrival ? arrivalIcon : departIcon;
        const marker = L.marker([courier.latitude, courier.longitude], { icon })
          .bindPopup(`
            <div class="courier-popup">
              <h3>${courier.nom}</h3>
              <p><strong>Tourn�e:</strong> ${courier.tourneeName}</p>
              <p><strong>Dernier scan:</strong> ${formatDate(courier.lastScan)}</p>
              <p><strong>Site:</strong> ${courier.siteName}</p>
              <p><strong>Statut:</strong> ${courier.isArrival ? 'Arriv�e' : 'D�part'}</p>
            </div>
          `);
        
        layerRef.current?.addLayer(marker);
      });
    }
    
    // Nettoyer le LayerGroup lors du d�montage du composant
    return () => {
      if (layerRef.current) {
        if (map.hasLayer(layerRef.current)) {
          map.removeLayer(layerRef.current);
        }
        layerRef.current = null;
      }
    };
  }, [courierLocations, departIcon, arrivalIcon, formatDate, map, isVisible]);
  
  // G�rer l'affichage/masquage de la couche en fonction du contr�le des couches
  useEffect(() => {
    const handleLayerControlChange = () => {
      const layersControl = document.querySelector('.leaflet-control-layers');
      if (layersControl) {
        const checkboxes = layersControl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          if ((checkbox as HTMLInputElement).nextSibling?.textContent?.trim() === 'Coursiers') {
            // Mettre �  jour l'�tat de visibilit� en fonction de la case �  cocher
            setIsVisible((checkbox as HTMLInputElement).checked);
            
            // Ajouter un �couteur d'�v�nements pour les changements futurs
            (checkbox as HTMLInputElement).addEventListener('change', (e) => {
              const isChecked = (e.target as HTMLInputElement).checked;
              setIsVisible(isChecked);
            });
          }
        });
      }
    };
    
    // Attendre que le contr�le des couches soit ajout�  la carte
    const checkLayersControl = () => {
      const layersControl = document.querySelector('.leaflet-control-layers');
      if (layersControl) {
        handleLayerControlChange();
      } else {
        // Si le contr�le n'est pas encore disponible, r�essayer plus tard
        setTimeout(checkLayersControl, 100);
      }
    };
    
    checkLayersControl();
    
    // Nettoyer les �couteurs d'�v�nements lors du d�montage du composant
    return () => {
      const layersControl = document.querySelector('.leaflet-control-layers');
      if (layersControl) {
        const checkboxes = layersControl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          if ((checkbox as HTMLInputElement).nextSibling?.textContent?.trim() === 'Coursiers') {
            (checkbox as HTMLInputElement).removeEventListener('change', () => {});
          }
        });
      }
    };
  }, [map]);
  
  return null;
};

// Composant pour g�rer les animations des marqueurs
const AnimatedMarker: React.FC<{
  position: [number, number];
  icon: L.Icon;
  popup: React.ReactNode;
  markerId: string;
}> = ({ position, icon, popup, markerId }) => {
  const markerRef = useRef<L.Marker | null>(null);
  const map = useMap();

  useEffect(() => {
    if (markerRef.current) {
      const marker = markerRef.current;
      const currentPos = marker.getLatLng();
      const targetPos = L.latLng(position[0], position[1]);

      // Animation fluide si le marqueur existe d�j� 
      if (currentPos && !currentPos.equals(targetPos)) {
        marker.slideTo(targetPos, {
          duration: 1000,
          keepAtCenter: false
        });
      }
    }
  }, [position]);

  return (
    <Marker
      position={position}
      icon={icon}
      ref={markerRef}
    >
      {popup}
    </Marker>
  );
};

// Coordonn�es du centre de la France
const franceCenter: [number, number] = [46.603354, 1.888334];

// Fonction pour g�n�rer des coordonn�es pour un site sans coordonn�es
const generateCoordinates = (site: Site, index: number): [number, number] => {
  // Coordonn�es de base (centre de la France)
  const baseLatitude = 46.603354;
  const baseLongitude = 1.888334;
  
  // Si le site a un code postal, utiliser les deux premiers chiffres pour g�n�rer des coordonn�es
  if (site.codePostal && site.codePostal.length >= 2) {
    const departement = parseInt(site.codePostal.substring(0, 2), 10);
    
    // Carte approximative des d�partements fran�ais (latitude et longitude)
    // Nous utilisons le num�ro de d�partement pour g�n�rer des coordonn�es approximatives
    const latOffset = ((departement % 10) - 5) * 0.5; // -2.5 �  +2.5 degr�s
    const lonOffset = ((Math.floor(departement / 10) % 10) - 5) * 0.5; // -2.5 �  +2.5 degr�s
    
    // Ajouter un petit d�calage pour chaque site dans le m�me d�partement
    const siteOffset = index * 0.01;
    
    return [
      baseLatitude + latOffset + siteOffset,
      baseLongitude + lonOffset + siteOffset
    ];
  }
  
  // Si le site a une ville mais pas de code postal, utiliser la premi�re lettre de la ville
  if (site.ville) {
    const firstLetter = site.ville.charAt(0).toUpperCase();
    const letterCode = firstLetter.charCodeAt(0) - 65; // A=0, B=1, etc.
    
    // Utiliser le code de la lettre pour g�n�rer des coordonn�es
    const latOffset = ((letterCode % 5) - 2) * 0.5; // -1 �  +1 degr�s
    const lonOffset = ((Math.floor(letterCode / 5) % 5) - 2) * 0.5; // -1 �  +1 degr�s
    
    // Ajouter un petit d�calage pour chaque site dans la m�me ville
    const siteOffset = index * 0.01;
    
    return [
      baseLatitude + latOffset + siteOffset,
      baseLongitude + lonOffset + siteOffset
    ];
  }
  
  // Si le site n'a ni code postal ni ville, utiliser un d�calage bas� sur l'index
  return [
    baseLatitude + (index * 0.01),
    baseLongitude + (index * 0.01)
  ];
};

// Composant pour la l�gende des sites
const SiteLegend: React.FC = () => {
  const map = useMap();
  const [markerPreferences, setMarkerPreferences] = useState<MarkerPreference[]>([]);
  const legendControlRef = useRef<any>(null);
  const updateTimerRef = useRef<number | null>(null);

  // Utiliser useMemo pour �viter les recalculs inutiles du contenu de la l�gende
  const legendContent = useMemo(() => {
    // Utiliser les pr�f�rences de marqueurs si disponibles
    const legendItems = markerPreferences.length > 0 
      ? markerPreferences.map(pref => `
          <div class="site-legend-item">
            <div class="site-legend-color" style="background-color: ${pref.color};"></div>
            <div class="site-legend-label">${pref.name}</div>
          </div>
        `).join('')
      : `
        <div class="site-legend-item">
          <div class="site-legend-color site-legend-color-laboratoire"></div>
          <div class="site-legend-label">Laboratoire</div>
        </div>
        <div class="site-legend-item">
          <div class="site-legend-color site-legend-color-clinique"></div>
          <div class="site-legend-label">Clinique</div>
        </div>
        <div class="site-legend-item">
          <div class="site-legend-color site-legend-color-plateau"></div>
          <div class="site-legend-label">Plateau technique</div>
        </div>
        <div class="site-legend-item">
          <div class="site-legend-color site-legend-color-collecte"></div>
          <div class="site-legend-label">Point de collecte</div>
        </div>
        <div class="site-legend-item">
          <div class="site-legend-color site-legend-color-etablissement"></div>
          <div class="site-legend-label">�tablissement de sant�</div>
        </div>
        <div class="site-legend-item">
          <div class="site-legend-color site-legend-color-ehpad"></div>
          <div class="site-legend-label">Ehpad</div>
        </div>
        <div class="site-legend-item">
          <div class="site-legend-color site-legend-color-veterinaire"></div>
          <div class="site-legend-label">V�t�rinaire</div>
        </div>
      `;
    
    return `
      ${legendItems}
      <div class="site-legend-item generated">
        <div class="site-legend-color" style="border: 2px dashed red; opacity: 0.6;"></div>
        <div class="site-legend-label">Coordonn�es g�n�r�es</div>
      </div>
    `;
  }, [markerPreferences]);

  useEffect(() => {
    // R�cup�rer les pr�f�rences de marqueurs une seule fois
    const fetchPreferences = async () => {
      try {
        const preferencesRef = collection(db, 'markerPreferences');
        const snapshot = await getDocs(preferencesRef);
        
        if (!snapshot.empty) {
          const preferencesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as MarkerPreference[];
          
          setMarkerPreferences(preferencesData);
          // Utiliser un niveau de log moins verbeux
          console.debug(`L�gende: ${preferencesData.length} pr�f�rences de marqueurs charg�es`);
        }
      } catch (error) {
        console.error('Erreur lors de la r�cup�ration des pr�f�rences de marqueurs pour la l�gende:', 
error);
      }
    };
    
    fetchPreferences();
    
    // Cr�er un contr�le personnalis� pour la l�gende une seule fois
    if (!legendControlRef.current) {
      const LegendControl = L.Control.extend({
        options: {
          position: 'bottomright'
        },
        
        onAdd: function(map: L.Map): HTMLElement {
          const div = L.DomUtil.create('div', 'info legend site-legend');
          div.innerHTML = `
            <h4>Types de sites</h4>
            <div class="site-legend-items">Chargement...</div>
          `;
          return div;
        }
      });

      // Ajouter le contr�le �  la carte une seule fois
      legendControlRef.current = new LegendControl();
      map.addControl(legendControlRef.current);
    }

    // Mettre �  jour le contenu de la l�gende
    const updateLegendContent = () => {
      if (!legendControlRef.current || !legendControlRef.current._container) return;
      
      const legendContainer = legendControlRef.current._container.querySelector('.site-legend-items');
      if (!legendContainer) return;
      
      legendContainer.innerHTML = legendContent;
    };
    
    // Mettre �  jour le contenu initial
    updateLegendContent();
    
    // Configurer un �couteur pour les changements dans les pr�f�rences de marqueurs
    // avec une fr�quence limit�e pour �viter les mises �  jour trop fr�quentes
    const preferencesRef = collection(db, 'markerPreferences');
    const unsubscribe = onSnapshot(preferencesRef, (snapshot) => {
      // Annuler la mise �  jour pr�c�dente si elle est en attente
      if (updateTimerRef.current !== null) {
        clearTimeout(updateTimerRef.current);
      }
      
      // Planifier une nouvelle mise �  jour avec un d�lai pour limiter la fr�quence
      updateTimerRef.current = window.setTimeout(() => {
        const preferencesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MarkerPreference[];
        
        setMarkerPreferences(preferencesData);
        // Utiliser un niveau de log moins verbeux et limiter les informations affich�es
        if (import.meta.env.DEV) {
          console.debug(`Mise � jour de la l�gende: ${preferencesData.length} pr�f�rences`);
        }
        updateTimerRef.current = null;
      }, 1000); // Attendre 1 seconde avant de mettre �  jour
    });
    
    return () => {
      unsubscribe();
      if (updateTimerRef.current !== null) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, [map, legendContent]);

  // Nettoyer le contr�le lors du d�montage final du composant
  useEffect(() => {
    return () => {
      if (legendControlRef.current) {
        map.removeControl(legendControlRef.current);
        legendControlRef.current = null;
      }
    };
  }, [map]);

  return null;
};

// Composant pour les en-t�tes de section dans le contr�le des couches
const SectionHeader: React.FC<{ title: string }> = ({ title }) => {
  const map = useMap();
  
  useEffect(() => {
    // Ajouter un style personnalis� apr�s le rendu du composant
    const addCustomStyle = () => {
      const labels = document.querySelectorAll('.leaflet-control-layers-overlays label');
      
      labels.forEach(label => {
        const span = label.querySelector('span');
        if (span && span.textContent === title) {
          label.classList.add('layer-section-header');
          const checkbox = label.querySelector('input[type="checkbox"]') as HTMLInputElement;
          if (checkbox) {
            checkbox.disabled = true;
            checkbox.style.display = 'none';
          }
        }
      });
    };
    
    // Ex�cuter apr�s un court d�lai pour s'assurer que le DOM est mis �  jour
    setTimeout(addCustomStyle, 100);
    
    // Observer les changements dans le contr�le de couches
    const observer = new MutationObserver(addCustomStyle);
    const layersControl = document.querySelector('.leaflet-control-layers');
    
    if (layersControl) {
      observer.observe(layersControl, { childList: true, subtree: true });
    }
    
    return () => {
      observer.disconnect();
    };
  }, [title]);
  
  return <LayerGroup />;
};

// Composant pour ajouter le contr�le des libell�s et des filtres personnalis�s
const MapControls: React.FC<{
  showLabels: boolean,
  setShowLabels: (show: boolean) => void,
  sites: Site[],
  setSiteFilter: (filter: string | null) => void,
  currentFilter: string | null,
  showGeneratedCoordinates: boolean,
  setShowGeneratedCoordinates: (show: boolean) => void,
  onZoomToSite: (site: Site) => void
}> = ({ 
  showLabels, 
  setShowLabels, 
  sites, 
  setSiteFilter, 
  currentFilter,
  showGeneratedCoordinates,
  setShowGeneratedCoordinates,
  onZoomToSite
}) => {
  const map = useMap();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<Site[]>([]);
  
  // Mettre �  jour les r�sultats de recherche lorsque le terme de recherche change
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }
    
    const normalizedSearch = searchTerm.toLowerCase();
    const results = sites.filter(site => 
      site.nom?.toLowerCase().includes(normalizedSearch) ||
      site.adresse?.toLowerCase().includes(normalizedSearch) ||
      site.ville?.toLowerCase().includes(normalizedSearch) ||
      site.codePostal?.includes(normalizedSearch) ||
      site.type?.toLowerCase().includes(normalizedSearch)
    ).slice(0, 5); // Limiter �  5 r�sultats
    
    setSearchResults(results);
  }, [searchTerm, sites]);
  
  useEffect(() => {
    // Cr�er un contr�le personnalis�
    const MapControlsControl = L.Control.extend({
      options: {
        position: 'topleft'
      },
      
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control map-custom-controls');
        
        // Bouton pour activer/d�sactiver les libell�s
        const labelsButton = L.DomUtil.create('a', 'leaflet-control-labels', container);
        labelsButton.innerHTML = '<i class="fas fa-tag"></i>';
        labelsButton.href = '#';
        labelsButton.title = showLabels ? 'Masquer les libell�s' : 'Afficher les libell�s';
        labelsButton.setAttribute('role', 'button');
        labelsButton.setAttribute('aria-label', showLabels ? 'Masquer les libell�s' : 'Afficher les libell�s');
        
        if (showLabels) {
          labelsButton.classList.add('active');
        }
        
        L.DomEvent.on(labelsButton, 'click', function(e) {
          L.DomEvent.preventDefault(e);
          setShowLabels(!showLabels);
          labelsButton.title = !showLabels ? 'Masquer les libell�s' : 'Afficher les libell�s';
          labelsButton.classList.toggle('active');
        });
        
        // Cr�er un conteneur pour les filtres
        const filtersContainer = L.DomUtil.create('div', 'map-filters-container', container);
        filtersContainer.style.display = filtersVisible ? 'block' : 'none';
        
        // Ajouter un titre
        const filterTitle = L.DomUtil.create('div', 'map-filter-title', filtersContainer);
        filterTitle.textContent = 'Filtres';
        
        // Ajouter un champ de recherche
        const searchContainer = L.DomUtil.create('div', 'map-filter-search', filtersContainer);
        const searchInput = L.DomUtil.create('input', 'map-filter-search-input', searchContainer);
        searchInput.type = 'text';
        searchInput.placeholder = 'Rechercher un site...';
        searchInput.value = searchTerm;
        
        // Conteneur pour les r�sultats de recherche
        const searchResultsContainer = L.DomUtil.create('div', 'map-search-results', filtersContainer);
        searchResultsContainer.style.display = 'none';
        
        // Mettre �  jour les r�sultats de recherche
        const updateSearchResults = () => {
          searchResultsContainer.innerHTML = '';
          
          if (searchResults.length === 0) {
            if (searchTerm) {
              searchResultsContainer.innerHTML = '<div class="map-search-no-results">Aucun r�sultat trouv�</div>';
              searchResultsContainer.style.display = 'block';
            } else {
              searchResultsContainer.style.display = 'none';
            }
            return;
          }
          
          searchResultsContainer.style.display = 'block';
          
          searchResults.forEach(site => {
            const resultItem = L.DomUtil.create('div', 'map-search-result-item', searchResultsContainer);
            resultItem.innerHTML = `
              <div class="map-search-result-name">${site.nom}</div>
              <div class="map-search-result-details">
                ${site.type ? `<span>${site.type}</span>` : ''}
                ${site.ville ? `<span>${site.ville}</span>` : ''}
              </div>
            `;
            
            L.DomEvent.on(resultItem, 'click', function() {
              onZoomToSite(site);
              searchResultsContainer.style.display = 'none';
              setSearchTerm('');
              searchInput.value = '';
            });
          });
        };
        
        // Mettre �  jour les r�sultats initiaux
        updateSearchResults();
        
        // Mettre �  jour les r�sultats lorsqu'ils changent
        const observer = new MutationObserver(() => {
          updateSearchResults();
        });
        
        L.DomEvent.on(searchInput, 'input', function(e) {
          setSearchTerm((e.target as HTMLInputElement).value);
          if ((e.target as HTMLInputElement).value) {
            setSiteFilter((e.target as HTMLInputElement).value);
          } else {
            setSiteFilter(null);
            searchResultsContainer.style.display = 'none';
          }
        });
        
        // Ajouter une option pour afficher/masquer les coordonn�es g�n�r�es
        const generatedCoordsContainer = L.DomUtil.create('div', 'map-filter-option', filtersContainer);
        const generatedCoordsCheckbox = L.DomUtil.create('input', '', generatedCoordsContainer);
        generatedCoordsCheckbox.type = 'checkbox';
        generatedCoordsCheckbox.id = 'show-generated-coords';
        generatedCoordsCheckbox.checked = showGeneratedCoordinates;
        
        const generatedCoordsLabel = L.DomUtil.create('label', '', generatedCoordsContainer);
        generatedCoordsLabel.htmlFor = 'show-generated-coords';
        generatedCoordsLabel.textContent = 'Afficher les coordonn�es g�n�r�es';
        
        L.DomEvent.on(generatedCoordsCheckbox, 'change', function(e) {
          setShowGeneratedCoordinates((e.target as HTMLInputElement).checked);
        });
        
        // Bouton pour afficher/masquer les filtres
        const filtersButton = L.DomUtil.create('a', 'leaflet-control-filters', container);
        filtersButton.innerHTML = '<i class="fas fa-filter"></i>';
        filtersButton.href = '#';
        filtersButton.title = 'Filtres avanc�s';
        filtersButton.setAttribute('role', 'button');
        filtersButton.setAttribute('aria-label', 'Filtres avanc�s');
        
        if (filtersVisible) {
          filtersButton.classList.add('active');
        }
        
        L.DomEvent.on(filtersButton, 'click', function(e) {
          L.DomEvent.preventDefault(e);
          setFiltersVisible(!filtersVisible);
          filtersContainer.style.display = filtersVisible ? 'block' : 'none';
          filtersButton.classList.toggle('active');
        });
        
        // Emp�cher la propagation des �v�nements pour �viter que la carte ne se d�place
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        
        return container;
      }
    });
    
    // Ajouter le contr�le �  la carte
    const mapControlsControl = new MapControlsControl();
    map.addControl(mapControlsControl);
    
    return () => {
      map.removeControl(mapControlsControl);
    };
  }, [map, showLabels, setShowLabels, sites, setSiteFilter, currentFilter, searchTerm, filtersVisible, 
showGeneratedCoordinates, setShowGeneratedCoordinates, searchResults, onZoomToSite]);
  
  return null;
};

// Composant pour initialiser les �v�nements des couches
const LayersEventInitializer: React.FC = () => {
  const map = useMap();
  
  useEffect(() => {
    // Initialiser le contr�le des couches
    const initLayersControl = () => {
      const layersControl = document.querySelector('.leaflet-control-layers');
      if (layersControl) {
        // S'assurer que toutes les cases �  cocher sont coch�es par d�faut
        const checkboxes = layersControl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          (checkbox as HTMLInputElement).checked = true;
        });
        
        // D�clencher un �v�nement change sur chaque case �  cocher pour activer les couches
        checkboxes.forEach(checkbox => {
          const event = new Event('change', { bubbles: true });
          (checkbox as HTMLInputElement).dispatchEvent(event);
        });
        
        // Ajouter des s�parateurs visuels pour les sections
        const overlaysContainer = layersControl.querySelector('.leaflet-control-layers-overlays');
        if (overlaysContainer) {
          const labels = overlaysContainer.querySelectorAll('label');
          labels.forEach(label => {
            const text = label.textContent?.trim();
            if (text && text.startsWith('---')) {
              // Cr�er un �l�ment de s�paration
              const separator = document.createElement('div');
              separator.className = 'layer-section-header';
              separator.innerHTML = `<span>${text.replace(/^---\s*/, '')}</span>`;
              
              // Remplacer le label par le s�parateur
              label.parentNode?.replaceChild(separator, label);
            }
          });
        }
      } else {
        // Si le contr�le n'est pas encore disponible, r�essayer plus tard
        setTimeout(initLayersControl, 100);
      }
    };
    
    // Attendre que la carte soit charg�e avant d'initialiser le contr�le des couches
    setTimeout(initLayersControl, 500);
    
    return () => {
      // Nettoyer les �couteurs d'�v�nements si n�cessaire
    };
  }, [map]);
  
  return null;
};

// Composant pour corriger manuellement les coordonn�es d'un site
const ManualCoordinatesCorrection: React.FC<{
  sites: Site[];
  onCoordinatesUpdated: (siteId: string, latitude: number, longitude: number) => void;
}> = ({ sites, onCoordinatesUpdated }) => {
  const map = useMap();
  const [isActive, setIsActive] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Site[]>([]);
  const markerRef = useRef<L.Marker | null>(null);
  
  // Filtrer les sites en fonction du terme de recherche
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }
    
    const normalizedSearch = searchTerm.toLowerCase();
    const results = sites.filter(site => 
      site.nom?.toLowerCase().includes(normalizedSearch) ||
      site.adresse?.toLowerCase().includes(normalizedSearch) ||
      site.ville?.toLowerCase().includes(normalizedSearch) ||
      site.codePostal?.includes(normalizedSearch)
    ).slice(0, 10); // Limiter �  10 r�sultats
    
    setSearchResults(results);
  }, [searchTerm, sites]);
  
  // Fonction pour s�lectionner un site
  const selectSite = (site: Site) => {
    setSelectedSite(site);
    setSearchTerm('');
    setSearchResults([]);
    
    if (site.latitude && site.longitude) {
      // Centrer la carte sur le site
      map.setView([site.latitude, site.longitude], 15);
      
      // Cr�er un marqueur d�pla�able
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
      
      const marker = L.marker([site.latitude, site.longitude], {
        draggable: true,
        icon: L.divIcon({
          className: 'correction-marker',
          html: `<div style="background-color: red; width: 24px; height: 24px; border-radius: 50%; 
display: flex; justify-content: center; align-items: center; box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);">
                  <i class="fas fa-map-marker-alt" style="color: white; font-size: 14px;"></i>
                </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(map);
      
      // Ajouter un popup avec les informations du site
      marker.bindPopup(`
        <div>
          <strong>${site.nom}</strong><br>
          ${site.adresse}<br>
          ${site.codePostal} ${site.ville || ''}
        </div>
      `).openPopup();
      
      // Mettre �  jour les coordonn�es lorsque le marqueur est d�plac�
      marker.on('dragend', (e) => {
        const newLatLng = marker.getLatLng();
        console.log(`Nouvelles coordonn�es pour ${site.nom}: Lat=${newLatLng.lat}, Lng=${newLatLng.lng}`);
      });
      
      markerRef.current = marker;
    } else {
      alert(`Le site "${site.nom}" n'a pas de coordonn�es. Veuillez d'abord le g�ocoder.`);
    }
  };
  
  // Fonction pour enregistrer les nouvelles coordonn�es
  const saveCoordinates = () => {
    if (selectedSite && markerRef.current) {
      const newLatLng = markerRef.current.getLatLng();
      onCoordinatesUpdated(selectedSite.id, newLatLng.lat, newLatLng.lng);
      
      // Afficher un message de confirmation
      alert(`Les coordonn�es du site "${selectedSite.nom}" ont ét� mises �  jour.`);
      
      // R�initialiser
      map.removeLayer(markerRef.current);
      markerRef.current = null;
      setSelectedSite(null);
      setIsActive(false);
    }
  };
  
  // Fonction pour annuler la correction
  const cancelCorrection = () => {
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    
    setSelectedSite(null);
    setIsActive(false);
  };
  
  useEffect(() => {
    // Cr�er un contr�le personnalis�
    const CorrectionControl = L.Control.extend({
      options: {
        position: 'topleft'
      },
      
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control correction-control');
        
        
        if (!isActive) {
          // Bouton pour activer la correction
          const button = L.DomUtil.create('a', 'correction-button', container);
          button.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
          button.href = '#';
          button.title = 'Corriger les coordonn�es d\'un site';
          
          L.DomEvent.on(button, 'click', function(e) {
            L.DomEvent.preventDefault(e);
            setIsActive(true);
          });
        } else {
          // Interface de correction
          const correctionPanel = L.DomUtil.create('div', 'correction-panel', container);
          
          // Titre
          const title = L.DomUtil.create('div', 'correction-title', correctionPanel);
          title.textContent = 'Correction de coordonn�es';
          
          // Champ de recherche
          const searchContainer = L.DomUtil.create('div', 'correction-search', correctionPanel);
          const searchInput = L.DomUtil.create('input', 'correction-search-input', searchContainer);
          searchInput.type = 'text';
          searchInput.placeholder = 'Rechercher un site...';
          searchInput.value = searchTerm;
          
          L.DomEvent.on(searchInput, 'input', function(e) {
            setSearchTerm((e.target as HTMLInputElement).value);
          });
          
          // R�sultats de recherche
          if (searchResults.length > 0) {
            const resultsContainer = L.DomUtil.create('div', 'correction-results', correctionPanel);
            
            searchResults.forEach(site => {
              const resultItem = L.DomUtil.create('div', 'correction-result-item', resultsContainer);
              resultItem.textContent = site.nom;
              
              L.DomEvent.on(resultItem, 'click', function() {
                selectSite(site);
              });
            });
          }
          
          // Site s�lectionn�
          if (selectedSite) {
            const selectedContainer = L.DomUtil.create('div', 'correction-selected', correctionPanel);
            
            const siteInfo = L.DomUtil.create('div', 'correction-site-info', selectedContainer);
            siteInfo.innerHTML = `
              <strong>${selectedSite.nom}</strong><br>
              ${selectedSite.adresse}<br>
              ${selectedSite.codePostal} ${selectedSite.ville || ''}
            `;
            
            const instructions = L.DomUtil.create('div', 'correction-instructions', selectedContainer);
            instructions.textContent = 'D�placez le marqueur rouge � la position correcte, puis cliquez sur "Enregistrer".';
            
            const buttonsContainer = L.DomUtil.create('div', 'correction-buttons', selectedContainer);
            
            const saveButton = L.DomUtil.create('button', 'correction-save-button', buttonsContainer);
            saveButton.textContent = 'Enregistrer';
            
            L.DomEvent.on(saveButton, 'click', function() {
              saveCoordinates();
            });
            
            const cancelButton = L.DomUtil.create('button', 'correction-cancel-button', buttonsContainer);
            cancelButton.textContent = 'Annuler';
            
            L.DomEvent.on(cancelButton, 'click', function() {
              cancelCorrection();
            });
          }
          
          // Bouton pour fermer le panneau
          if (!selectedSite) {
            const closeButton = L.DomUtil.create('button', 'correction-close-button', correctionPanel);
            closeButton.textContent = 'Fermer';
            
            L.DomEvent.on(closeButton, 'click', function() {
              setIsActive(false);
            });
          }
        }
        
        // Emp�cher la propagation des �v�nements pour �viter que la carte ne se d�place
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        
        return container;
      }
    });
    
    // Ajouter le contr�le �  la carte
    const correctionControl = new CorrectionControl();
    map.addControl(correctionControl);
    
    return () => {
      map.removeControl(correctionControl);
      
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, isActive, searchTerm, searchResults, selectedSite, sites, onCoordinatesUpdated]);
  
  return null;
};

// Composant de marqueur m�mo�s�
const MemoizedMarker = React.memo<{ 
  site: Site, 
  markerPreferences: MarkerPreference[] 
}>(({ site, markerPreferences }) => {
  // R�cup�rer l'ic�ne personnalis�e en fonction des pr�f�rences
  const siteIcon = useMemo(() => {
    const normalizedSiteType = normalizeType(site.type);
    
    const preference = markerPreferences.find(pref => 
      normalizeType(pref.siteType) === normalizedSiteType
    );

    if (preference) {
      return L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="background-color: ${preference.color}; 
                      width: 24px; 
                      height: 24px; 
                      border-radius: 50%; 
                      display: flex; 
                      justify-content: center; 
                      align-items: center; 
                      box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);">
            <i class="fas ${getIconClassForType(preference.icon)}" 
               style="color: white; font-size: 14px;"></i>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
    }

    return getDefaultIconForSiteType(site.type);
  }, [site.type, markerPreferences]);

  if (!site.latitude || !site.longitude) return null;

  return (
    <Marker 
      key={site.id}
      position={[site.latitude, site.longitude] as L.LatLngTuple}
      icon={siteIcon}
    >
      <Popup>
        <div>
          <strong>{site.nom}</strong>
          <br />
          {site.adresse}
          <br />
          {site.ville} {site.codePostal}
          <br />
          Type: {site.type}
        </div>
      </Popup>
    </Marker>
  );
}, (prevProps, nextProps) => {
  // Comparaison personnalis�e pour �viter les re-rendus inutiles
  return (
    prevProps.site.id === nextProps.site.id &&
    prevProps.site.latitude === nextProps.site.latitude &&
    prevProps.site.longitude === nextProps.site.longitude &&
    prevProps.site.type === nextProps.site.type &&
    JSON.stringify(prevProps.markerPreferences) === JSON.stringify(nextProps.markerPreferences)
  );
});

// Composant de clustering dynamique
const SiteLayer: React.FC<{ 
  sites: Site[], 
  visibleTypes?: string[], 
  maxMarkers?: number 
}> = ({ 
  sites, 
  visibleTypes = [], 
  maxMarkers = 500 
}) => {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(8);
  const [visibleSites, setVisibleSites] = useState<Site[]>([]);
  const [markerPreferences, setMarkerPreferences] = useState<MarkerPreference[]>([]);

  // Mettre � jour le zoom lors des changements de la carte
  useEffect(() => {
    if (!map) return;

    const updateZoom = () => {
      setCurrentZoom(map.getZoom());
    };

    map.on('zoomend', updateZoom);
    return () => {
      map.off('zoomend', updateZoom);
    };
  }, [map]);

  // Charger les pr�f�rences de marqueurs
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const preferencesRef = collection(db, 'markerPreferences');
        const snapshot = await getDocs(preferencesRef);
        
        const preferencesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MarkerPreference[];
        
        setMarkerPreferences(preferencesData);
      } catch (error) {
        console.error('Erreur lors du chargement des pr�f�rences de marqueurs:', error);
      }
    };

    fetchPreferences();
  }, []);

  // Filtrage et pagination des sites
  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      const normalizedSiteType = normalizeType(site.type);
      
      // Si aucun type n'est s�lectionn�, afficher tous les sites
      if (visibleTypes.length === 0) {
        return site.latitude && site.longitude;
      }
      
      // V�rifier si le type de site est dans les types s�lectionn�s
      const isTypeVisible = visibleTypes.some(selectedType => 
        normalizedSiteType === normalizeType(selectedType)
      );
      
      return isTypeVisible && site.latitude && site.longitude;
    });
  }, [sites, visibleTypes]);

  // Mettre � jour les sites visibles
  useEffect(() => {
    const sitesToShow = filteredSites.slice(0, maxMarkers);
    setVisibleSites(sitesToShow);

    // Ajuster la vue de la carte
    if (map && sitesToShow.length > 0) {
      const coordinates = sitesToShow
        .map(site => [site.latitude, site.longitude])
        .filter((coords): coords is [number, number] => 
          coords[0] !== undefined && 
          coords[1] !== undefined && 
          !isNaN(coords[0]) && 
          !isNaN(coords[1])
        );
      
      if (coordinates.length > 0) {
        const bounds = L.latLngBounds(coordinates);
        map.fitBounds(bounds, { 
          padding: [50, 50],
          maxZoom: 12
        });
      }
    }
  }, [filteredSites, map, maxMarkers]);

  // Clustering personnalis�
  const renderMarkers = useMemo(() => {
    // Si le nombre de sites est faible, afficher tous les marqueurs
    if (visibleSites.length <= 50) {
      return visibleSites.map(site => (
        <MemoizedMarker 
          key={site.id} 
          site={site} 
          markerPreferences={markerPreferences}
        />
      ));
    }

    // Clustering dynamique bas� sur le niveau de zoom
    const currentZoom = map ? map.getZoom() : 8; // Zoom par d�faut
    const clusterThreshold = 12; // Niveau de zoom o� le clustering commence � se d�sagr�ger
    const clusterRadius = currentZoom < clusterThreshold 
      ? 0.2 // Rayon de clustering plus grand pour les zooms �loign�s
      : 0.05; // Rayon plus petit pour un d�groupement plus pr�coce

    const clusters: { [key: string]: Site[] } = {};

    visibleSites.forEach(site => {
      if (!site.latitude || !site.longitude) return;

      let clustered = false;
      for (const clusterKey in clusters) {
        const [clusterLat, clusterLng] = clusterKey.split(',').map(Number);
        const distance = Math.sqrt(
          Math.pow(site.latitude - clusterLat, 2) + 
          Math.pow(site.longitude - clusterLng, 2)
        );

        // Ajuster la logique de clustering en fonction du zoom
        if (distance < clusterRadius) {
          clusters[clusterKey].push(site);
          clustered = true;
          break;
        }
      }

      if (!clustered) {
        const newClusterKey = `${site.latitude.toFixed(1)},${site.longitude.toFixed(1)}`;
        clusters[newClusterKey] = [site];
      }
    });

    // Rendu des clusters
    return Object.entries(clusters).flatMap(([key, clusterSites]) => {
      // D�grouper plus t�t si le zoom est suffisant
      if (currentZoom >= clusterThreshold || clusterSites.length <= 3) {
        return clusterSites.map(site => (
          <MemoizedMarker 
            key={site.id} 
            site={site} 
            markerPreferences={markerPreferences}
          />
        ));
      }

      // Cluster avec plusieurs sites
      const validSites = clusterSites.filter((site): site is Site => 
        site.latitude !== undefined && 
        site.longitude !== undefined
      );

      if (validSites.length === 0) return [];

      const centerLat = validSites.reduce((sum, site) => sum + (site.latitude || 0), 0) / validSites.length;
      const centerLng = validSites.reduce((sum, site) => sum + (site.longitude || 0), 0) / validSites.length;

      // D�terminer l'ic�ne et la couleur du cluster
      const clusterPreference = markerPreferences.find(pref => 
        normalizeType(pref.siteType) === 
        normalizeType(validSites[0].type)
      );

      return [
        <Marker 
          key={`cluster-${key}`} 
          position={[centerLat, centerLng]}
          icon={L.divIcon({
            className: 'marker-cluster',
            html: `
              <div style="
                background-color: ${clusterPreference?.color || 'gray'}; 
                width: 40px; 
                height: 40px; 
                border-radius: 50%; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                color: white; 
                font-weight: bold;
                box-shadow: 0 0 5px rgba(0,0,0,0.3);
                opacity: ${currentZoom < clusterThreshold ? 1 : 0.7};
              ">
                ${clusterSites.length}
              </div>
            `,
            iconSize: L.point(40, 40)
          })}
        >
          <Popup>
            <div>
              <strong>Cluster de {clusterSites.length} sites</strong>
              <ul>
                {clusterSites.slice(0, 5).map(site => (
                  <li key={site.id}>{site.nom}</li>
                ))}
                {clusterSites.length > 5 && <li>... et {clusterSites.length - 5} autres</li>}
              </ul>
            </div>
          </Popup>
        </Marker>
      ];
    }); 
  }, [visibleSites, markerPreferences, map, currentZoom]);

  return <>{renderMarkers}</>;
};

const MapView: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [markerPreferences, setMarkerPreferences] = useState<MarkerPreference[]>([]);
  const mapRef = useRef<L.Map | null>(null);

  // Charger les sites et les pr�f�rences de marqueurs
  useEffect(() => {
    const loadData = async () => {
      try {
        // Charger les sites
        const sitesCollection = collection(db, 'sites');
        const sitesSnapshot = await getDocs(sitesCollection);
        const loadedSites = sitesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Site));

        // Filtrer les sites avec coordonn�es
        const validSites = loadedSites.filter(site => 
          site.latitude && site.longitude
        );

        setSites(validSites);

        // Charger les pr�f�rences de marqueurs
        const preferencesRef = collection(db, 'markerPreferences');
        const preferencesSnapshot = await getDocs(preferencesRef);
        const preferencesData = preferencesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MarkerPreference[];

        setMarkerPreferences(preferencesData);
      } catch (error) {
        console.error('Erreur lors du chargement des donn�es:', error);
      }
    };

    loadData();
  }, []);

  // Gestion des types de sites s�lectionn�s
  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <MapContainer 
      center={[43.6, 3.8]} 
      zoom={8} 
      style={{ height: '100vh', width: '100%' }}
      ref={(ref) => { mapRef.current = ref; }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Contr�le plein �cran */}
      <FullscreenControl />

      {/* L�gende des sites */}
      <div style={{ 
        position: 'absolute', 
        bottom: '20px', 
        right: '20px', 
        zIndex: 1000, 
        background: 'white', 
        padding: '10px', 
        borderRadius: '5px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ margin: '0 0 10px 0', textAlign: 'center' }}>Types de sites</h4>
        {SITE_TYPES.map(type => {
          const normalizedType = normalizeType(type);
          const preference = markerPreferences.find(pref => 
            normalizeType(pref.siteType) === normalizedType
          );

          return (
            <div 
              key={type} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '5px' 
              }}
            >
              <div 
                style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  marginRight: '10px',
                  backgroundColor: preference ? preference.color : 'gray',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {preference && (
                  <i 
                    className={`fas ${getIconClassForType(preference.icon)}`} 
                    style={{ 
                      color: 'white', 
                      fontSize: '12px' 
                    }} 
                  />
                )}
              </div>
              <span>{type}</span>
            </div>
          );
        })}
      </div>

      {/* Contr�le de s�lection des types de sites */}
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        zIndex: 1000, 
        background: 'white', 
        padding: '10px', 
        borderRadius: '5px' 
      }}>
        {SITE_TYPES.map(type => (
          <label key={type} style={{ display: 'block' }}>
            <input 
              type="checkbox" 
              checked={selectedTypes.includes(normalizeType(type))}
              onChange={() => handleTypeToggle(normalizeType(type))}
            />
            {type}
          </label>
        ))}
      </div>

      {/* Couche de sites avec optimisations */}
      <SiteLayer 
        sites={sites} 
        visibleTypes={selectedTypes}
        maxMarkers={500}
      />
    </MapContainer>
  );
};

// Fonction pour obtenir la classe d'ic�ne FontAwesome en fonction du type
const getIconClassForType = (iconType: string): string => {
  switch (iconType) {
    case 'droplet':
      return 'fa-tint';
    case 'circle':
      return 'fa-circle';
    case 'square':
      return 'fa-square';
    case 'triangle':
      return 'fa-exclamation-triangle';
    case 'star':
      return 'fa-star';
    case 'pin':
      return 'fa-map-marker-alt';
    default:
      return 'fa-tint';
  }
};

// Extension du prototype de Marker pour ajouter slideTo
declare module 'leaflet' {
  interface Marker {
    slideTo(latlng: L.LatLng, options?: { duration?: number; keepAtCenter?: boolean }): void;
  }
}

L.Marker.prototype.slideTo = function(latlng: L.LatLng, options: { duration?: number; keepAtCenter?: boolean } = {}) {
  const duration = options.duration || 1000;
  const keepAtCenter = options.keepAtCenter || false;
  
  const start = this.getLatLng();
  const startTime = performance.now();
  
  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const lat = start.lat + (latlng.lat - start.lat) * progress;
    const lng = start.lng + (latlng.lng - start.lng) * progress;
    
    this.setLatLng([lat, lng]);
    
    if (keepAtCenter) {
      this._map?.setView([lat, lng]);
    }
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
};

export default MapView; 



