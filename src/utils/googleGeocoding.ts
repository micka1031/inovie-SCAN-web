/**
 * Service de géocodage utilisant l'API Google Maps
 */

import { mapService } from '../services/mapService';
import { placesService, OpeningHours } from '../services/placesService';

// Clé API Google Maps (à récupérer de l'environnement ou d'une configuration)
// La clé est déjà utilisée dans mapService
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Vérifier si la clé API est définie
console.log('API Key définie:', !!GOOGLE_MAPS_API_KEY);
// Ne pas afficher la clé complète pour des raisons de sécurité
console.log('Premiers caractères de la clé:', GOOGLE_MAPS_API_KEY ? GOOGLE_MAPS_API_KEY.substring(0, 5) + '...' : 'Non définie');

// Cache pour stocker les résultats de géocodage
const geocodeCache: Record<string, {latitude: number, longitude: number} | null> = {};

/**
 * Nettoie et normalise une adresse
 * @param address Adresse à nettoyer
 * @returns Adresse nettoyée
 */
const cleanAddress = (address: string): string => {
  if (!address) return '';
  
  // Supprimer les mentions inutiles
  const cleanedAddress = address
    .replace(/\b(rdc|rez[- ]de[- ]chauss[ée]e)\b/gi, '')  // Supprimer RDC/Rez-de-chaussée
    .replace(/\b(bat|bât|batiment|bâtiment)\b\.?\s*([0-9a-z])/gi, 'Bâtiment $2')  // Normaliser "bâtiment"
    .replace(/\b(apt|appt|appartement)\b\.?\s*([0-9a-z])/gi, 'Appartement $2')  // Normaliser "appartement"
    .replace(/\s+/g, ' ')  // Remplacer les espaces multiples par un seul espace
    .trim();
    
  return cleanedAddress;
};

/**
 * Normalise un nom de lieu pour le géocodage
 * @param name Nom du lieu à normaliser
 * @returns Nom normalisé
 */
const normalizeLocationName = (name: string): string => {
  if (!name) return '';
  
  // Normaliser les caractères spéciaux et la casse
  let normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  
  // Remplacer les abréviations courantes
  const replacements: Record<string, string> = {
    'via domitia': 'voie domitienne',
    'zac': 'zone d\'activité',
    'zi': 'zone industrielle',
    'za': 'zone artisanale',
    'rdc': '',
    'rez de chaussee': '',
    'rez-de-chaussee': ''
  };
  
  // Appliquer les remplacements
  Object.entries(replacements).forEach(([pattern, replacement]) => {
    normalized = normalized.replace(new RegExp(`\\b${pattern}\\b`, 'g'), replacement);
  });
  
  return normalized.trim();
};

/**
 * Géocode une adresse avec l'API Google Maps et récupère les horaires d'ouverture
 * @param fullAddress Adresse complète à géocoder
 * @returns Coordonnées géographiques (latitude, longitude) et horaires d'ouverture
 */
const geocodeWithGoogleMaps = async (
  fullAddress: string
): Promise<{latitude: number, longitude: number, openingHours?: OpeningHours} | null> => {
  try {
    console.log('Tentative de géocodage avec Google Maps pour:', fullAddress);
    
    // S'assurer que l'API Google Maps est chargée
    await mapService.loadGoogleMapsAPI();
    
    // Vérifier si un géocodeur est disponible
    if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
      console.error('API de géocodage Google Maps non disponible');
      return null;
    }
    
    // Créer une instance du géocodeur
    const geocoder = new window.google.maps.Geocoder();
    
    // Utiliser une promesse pour gérer le callback du géocodeur
    const geocodeResult = await new Promise<{latitude: number, longitude: number} | null>((resolve) => {
      geocoder.geocode({ address: fullAddress, region: 'fr' }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const location = results[0].geometry.location;
          const latitude = location.lat();
          const longitude = location.lng();
          
          // Validation des coordonnées
          if (isNaN(latitude) || isNaN(longitude)) {
            console.warn('Coordonnées invalides pour Google Maps:', { 
              fullAddress, 
              rawData: results[0],
              latitude, 
              longitude 
            });
            resolve(null);
            return;
          }
          
          // Vérification de la plage de coordonnées pour la France
          if (
            latitude < 41 || latitude > 51 || 
            longitude < -5 || longitude > 9
          ) {
            console.warn('Coordonnées hors de la zone France pour Google Maps:', { 
              fullAddress, 
              latitude, 
              longitude 
            });
            resolve(null);
            return;
          }
          
          console.log('Géocodage réussi avec Google Maps pour:', {
            fullAddress,
            latitude,
            longitude,
            precision: results[0].types ? results[0].types[0] : 'inconnu'
          });
          
          resolve({ latitude, longitude });
        } else {
          console.log(`Géocodage échoué avec Google Maps pour: ${fullAddress}, status: ${status}`);
          resolve(null);
        }
      });
    });
    
    // Si le géocodage a échoué, retourner null
    if (!geocodeResult) {
      return null;
    }
    
    // Retourner les coordonnées sans horaires
    return geocodeResult;
    
  } catch (error) {
    console.error('Erreur lors du géocodage avec Google Maps:', error);
    return null;
  }
};

/**
 * Géocode une adresse pour obtenir ses coordonnées géographiques et horaires d'ouverture
 * @param name Nom du site
 * @param address Adresse (rue, numéro)
 * @param city Ville
 * @param postalCode Code postal
 * @returns Coordonnées géographiques (latitude, longitude) et horaires d'ouverture
 */
export const geocodeAddress = async (
  name: string,
  address: string, 
  city: string, 
  postalCode: string
): Promise<{latitude: number, longitude: number, horairesLV?: string, horairesSamedi?: string} | null> => {
  try {
    // Nettoyer les données d'entrée
    const cleanedAddress = cleanAddress(address);
    const cleanedCity = city?.trim();
    const cleanedPostalCode = postalCode?.trim();
    
    // Vérifier la validité de l'adresse
    if (!cleanedAddress || !cleanedCity || !cleanedPostalCode) {
      console.warn('Adresse incomplète pour le géocodage:', { address, city, postalCode });
      return null;
    }
    
    // Créer plusieurs variantes d'adresse
    const addressVariants = [
      // Variante 1: Adresse + Code postal + Ville (format standard)
      `${cleanedAddress}, ${cleanedPostalCode} ${cleanedCity}, France`,
      
      // Variante 2: Nom + Adresse + Code postal + Ville
      name ? `${name}, ${cleanedAddress}, ${cleanedPostalCode} ${cleanedCity}, France` : '',
      
      // Variante 3: Adresse + Ville + Code postal (ordre alternatif)
      `${cleanedAddress}, ${cleanedCity}, ${cleanedPostalCode}, France`,
    ].filter(Boolean);
    
    // Essayer chaque variante d'adresse jusqu'à obtenir un résultat valide
    for (const addressVariant of addressVariants) {
      // Vérifier si l'adresse est dans le cache
      if (geocodeCache[addressVariant]) {
        console.log('Résultat trouvé dans le cache pour:', addressVariant);
        return geocodeCache[addressVariant];
      }
      
      const result = await geocodeWithGoogleMaps(addressVariant);
      
      if (result) {
        // Formater les horaires d'ouverture pour la base de données
        let horairesLV: string | undefined;
        let horairesSamedi: string | undefined;
        
        if (result.openingHours) {
          // Formate les horaires du lundi au vendredi (prend lundi comme référence)
          if (result.openingHours.lundi) {
            horairesLV = `${result.openingHours.lundi.ouverture}-${result.openingHours.lundi.fermeture}`;
          }
          
          // Formate les horaires du samedi
          if (result.openingHours.samedi) {
            horairesSamedi = `${result.openingHours.samedi.ouverture}-${result.openingHours.samedi.fermeture}`;
          }
        }
        
        // Créer l'objet de résultat avec les coordonnées et les horaires
        const formattedResult = {
          latitude: result.latitude,
          longitude: result.longitude,
          ...(horairesLV && { horairesLV }),
          ...(horairesSamedi && { horairesSamedi }),
        };
        
        // Mettre en cache toutes les variantes avec le même résultat
        addressVariants.forEach(variant => {
          geocodeCache[variant] = formattedResult;
        });
        
        return formattedResult;
      }
    }
    
    // Aucune variante n'a fonctionné
    console.warn('Échec du géocodage pour toutes les variantes d\'adresse:', {
      name,
      address: cleanedAddress,
      city: cleanedCity,
      postalCode: cleanedPostalCode
    });
    
    return null;
  } catch (error) {
    console.error('Erreur lors du géocodage de l\'adresse:', error);
    return null;
  }
};

/**
 * Géocode une adresse complète
 * @param fullAddress Adresse complète à géocoder
 * @returns Coordonnées géographiques (latitude, longitude) ou null si le géocodage échoue
 */
export const geocodeFullAddress = async (
  fullAddress: string
): Promise<{latitude: number, longitude: number, horairesLV?: string, horairesSamedi?: string} | null> => {
  try {
    if (!fullAddress) {
      console.warn('Adresse vide pour le géocodage');
      return null;
    }
    
    // Nettoyer l'adresse
    const cleanedAddress = cleanAddress(fullAddress);
    
    // Vérifier si l'adresse est dans le cache
    if (geocodeCache[cleanedAddress]) {
      console.log('Résultat trouvé dans le cache pour:', cleanedAddress);
      return geocodeCache[cleanedAddress];
    }
    
    // Créer des variantes avec et sans "France" à la fin
    const addressVariants = [
      cleanedAddress,
      `${cleanedAddress}, France`
    ];
    
    // Essayer chaque variante
    for (const addressVariant of addressVariants) {
      const result = await geocodeWithGoogleMaps(addressVariant);
      
      if (result) {
        // Formater les horaires d'ouverture pour la base de données
        let horairesLV: string | undefined;
        let horairesSamedi: string | undefined;
        
        if (result.openingHours) {
          // Formate les horaires du lundi au vendredi (prend lundi comme référence)
          if (result.openingHours.lundi) {
            horairesLV = `${result.openingHours.lundi.ouverture}-${result.openingHours.lundi.fermeture}`;
          }
          
          // Formate les horaires du samedi
          if (result.openingHours.samedi) {
            horairesSamedi = `${result.openingHours.samedi.ouverture}-${result.openingHours.samedi.fermeture}`;
          }
        }
        
        // Créer l'objet de résultat avec les coordonnées et les horaires
        const formattedResult = {
          latitude: result.latitude,
          longitude: result.longitude,
          ...(horairesLV && { horairesLV }),
          ...(horairesSamedi && { horairesSamedi }),
        };
        
        // Mettre en cache toutes les variantes
        addressVariants.forEach(variant => {
          geocodeCache[variant] = formattedResult;
        });
        
        return formattedResult;
      }
    }
    
    // Aucune variante n'a fonctionné
    console.warn('Échec du géocodage pour l\'adresse complète:', fullAddress);
    return null;
  } catch (error) {
    console.error('Erreur lors du géocodage de l\'adresse complète:', error);
    return null;
  }
}; 