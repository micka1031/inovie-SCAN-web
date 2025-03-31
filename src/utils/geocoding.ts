/**
 * Utilitaires pour le géocodage des adresses
 */
import { mapService } from '../services/mapService';

// Cache pour stocker les résultats de géocodage
const geocodeCache: Record<string, {latitude: number, longitude: number} | null> = {};

// Fonction pour valider les données d'adresse
const isValidAddress = (adresse: string, ville: string, codePostal: string): boolean => {
  // Vérifier que les champs ne sont pas vides ou composés uniquement d'espaces
  if (!adresse?.trim() || !ville?.trim() || !codePostal?.trim()) {
    return false;
  }

  // Vérifier que les champs ne contiennent pas des valeurs invalides
  const invalidValues = ['END', 'UNDEFINED', 'NULL', 'N/A', 'RDC', ''];
  const fieldsToCheck = [adresse.toUpperCase(), ville.toUpperCase(), codePostal.toUpperCase()];
  
  // Vérifier si un des champs contient uniquement des valeurs invalides
  return !fieldsToCheck.some(field => {
    const parts = field.split(/[,\s]+/).map(part => part.trim());
    return parts.length === 0 || parts.every(part => invalidValues.includes(part));
  });
};

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
 * Géocode une adresse avec l'API Google Maps
 * @param fullAddress Adresse complète à géocoder
 * @returns Coordonnées géographiques (latitude, longitude) ou null si le géocodage échoue
 */
const geocodeWithGoogleMaps = async (
  fullAddress: string
): Promise<{latitude: number, longitude: number} | null> => {
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
    const result = await new Promise<{latitude: number, longitude: number} | null>((resolve) => {
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
    
    return result;
  } catch (error) {
    console.error('Erreur lors du géocodage avec Google Maps:', error);
    return null;
  }
};

/**
 * Géocode une adresse pour obtenir ses coordonnées géographiques
 * @param name Nom du site
 * @param address Adresse (rue, numéro)
 * @param city Ville
 * @param postalCode Code postal
 * @returns Coordonnées géographiques (latitude, longitude) ou null si le géocodage échoue
 */
export const geocodeAddress = async (
  name: string,
  address: string, 
  city: string, 
  postalCode: string
): Promise<{latitude: number, longitude: number, fromCache?: boolean} | null> => {
  try {
    // Nettoyer les données d'entrée
    const cleanedAddress = cleanAddress(address);
    const cleanedCity = city?.trim();
    const cleanedPostalCode = postalCode?.trim();
    
    // Valider les données avant de procéder
    if (!isValidAddress(cleanedAddress, cleanedCity, cleanedPostalCode)) {
      console.warn('Géocodage impossible - Données d\'adresse invalides:', { 
        name,
        address: cleanedAddress, 
        city: cleanedCity, 
        postalCode: cleanedPostalCode 
      });
      return null;
    }

    // Construire l'adresse complète SANS le nom du site
    const addressParts = [
      cleanedAddress,
      cleanedCity,
      cleanedPostalCode,
      'France'
    ].filter(part => part && typeof part === 'string' && part.trim() !== '');

    const fullAddress = addressParts.join(', ');
    
    // Logs détaillés pour le débogage
    console.log('Détails du géocodage:', {
      originalAddress: address,
      cleanedAddress,
      originalCity: city,
      cleanedCity,
      originalPostalCode: postalCode,
      cleanedPostalCode,
      fullAddress,
      addressParts
    });
    
    // Vérifier si l'adresse est déjà dans le cache
    const cacheKey = fullAddress.toLowerCase();
    if (geocodeCache[cacheKey] !== undefined) {
      console.log('Utilisation du cache pour:', fullAddress);
      const cachedResult = geocodeCache[cacheKey];
      if (cachedResult) {
        return { ...cachedResult, fromCache: true };
      }
      return cachedResult;
    }
    
    // Utiliser Google Maps pour le géocodage
    let result = await geocodeWithGoogleMaps(fullAddress);
    
    // Si l'adresse complète échoue, essayer avec une adresse simplifiée
    if (!result) {
      console.log('Tentative avec adresse simplifiée...');
      const simpleAddress = [cleanedCity, cleanedPostalCode, 'France']
        .filter(part => part && typeof part === 'string' && part.trim() !== '')
        .join(', ');
      
      console.log('Adresse simplifiée:', simpleAddress);
      
      // Vérifier si l'adresse simplifiée est déjà dans le cache
      const simpleCacheKey = simpleAddress.toLowerCase();
      if (geocodeCache[simpleCacheKey] !== undefined) {
        console.log('Utilisation du cache pour adresse simplifiée:', simpleAddress);
        result = geocodeCache[simpleCacheKey];
      } else {
        // Essayer avec l'adresse simplifiée
        result = await geocodeWithGoogleMaps(simpleAddress);
        
        // Stocker le résultat dans le cache pour l'adresse simplifiée
        if (result) {
          geocodeCache[simpleCacheKey] = result;
        }
      }
    }
    
    // Stocker le résultat dans le cache pour l'adresse complète
    if (result) {
      geocodeCache[cacheKey] = result;
    } else {
      console.warn('Géocodage impossible pour le site:', { 
        name,
        fullAddress,
        address: cleanedAddress, 
        city: cleanedCity, 
        postalCode: cleanedPostalCode 
      });
    }
    
    return result;
  } catch (error) {
    console.error('Erreur lors du géocodage:', error);
    return null;
  }
};

/**
 * Géocode une adresse complète pour obtenir ses coordonnées géographiques
 * @param fullAddress Adresse complète
 * @returns Coordonnées géographiques (latitude, longitude) ou null si le géocodage échoue
 */
export const geocodeFullAddress = async (
  fullAddress: string
): Promise<{latitude: number, longitude: number} | null> => {
  try {
    // Vérifier si l'adresse est déjà dans le cache
    const cacheKey = fullAddress.toLowerCase();
    if (geocodeCache[cacheKey] !== undefined) {
      console.log('Utilisation du cache pour:', fullAddress);
      return geocodeCache[cacheKey];
    }
    
    // Utiliser uniquement Google Maps
    const result = await geocodeWithGoogleMaps(fullAddress);
    
    // Stocker le résultat dans le cache
    geocodeCache[cacheKey] = result;
    
    return result;
  } catch (error) {
    console.error('Erreur lors du géocodage:', error);
    return null;
  }
};

/**
 * Version simplifiée pour geocoder une adresse complète en tant que chaîne
 * Cette version est compatible avec les composants SitesTableAdvanced
 * @param address Adresse complète à géocoder
 * @returns Résultat avec succès, message et coordonnées
 */
export const geocodeSimpleAddress = async (
  address: string
): Promise<{success: boolean, message?: string, latitude: number, longitude: number}> => {
  try {
    if (!address) {
      return {
        success: false,
        message: 'Adresse vide',
        latitude: 0,
        longitude: 0
      };
    }

    // Appeler la version existante qui prend une adresse complète
    const result = await geocodeFullAddress(address);
    
    if (result) {
      return {
        success: true,
        latitude: result.latitude,
        longitude: result.longitude
      };
    } else {
      return {
        success: false,
        message: 'Géocodage impossible',
        latitude: 0,
        longitude: 0
      };
    }
  } catch (error) {
    console.error('Erreur lors du géocodage simplifié:', error);
    return {
      success: false,
      message: `Erreur: ${error}`,
      latitude: 0,
      longitude: 0
    };
  }
}; 
