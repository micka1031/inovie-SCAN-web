/**
 * Utilitaires pour le géocodage des adresses
 */

// Cache pour stocker les résultats de géocodage
const geocodeCache: Record<string, {latitude: number, longitude: number} | null> = {};

// Clé API Mapbox (à remplacer par votre propre clé)
// Vous devez créer un compte sur https://www.mapbox.com/ et obtenir une clé API
const MAPBOX_API_KEY = 'pk.eyJ1IjoiaW5vdmllLXN1aXZpLWNvbGlzIiwiYSI6ImNsZXh0ZjRhbzBpNXgzcG1yNGt2NWt0bXcifQ.HVEFXKCGsmXM-pZ6HA3tYA';

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
 * Géocode une adresse avec l'API Nominatim d'OpenStreetMap
 * @param fullAddress Adresse complète à géocoder
 * @returns Coordonnées géographiques (latitude, longitude) ou null si le géocodage échoue
 */
const geocodeWithNominatim = async (
  fullAddress: string
): Promise<{latitude: number, longitude: number} | null> => {
  try {
    console.log('Tentative de géocodage avec Nominatim pour:', fullAddress);
    
    // Ajouter un User-Agent pour respecter les conditions d'utilisation de Nominatim
    const headers = {
      'User-Agent': 'InovieSuiviColis/1.0',
      'Accept-Language': 'fr'
    };
    
    // Utiliser l'API Nominatim d'OpenStreetMap pour le géocodage
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1&addressdetails=1&countrycodes=fr`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const latitude = parseFloat(data[0].lat);
      const longitude = parseFloat(data[0].lon);
      
      // Validation supplémentaire des coordonnées
      if (isNaN(latitude) || isNaN(longitude)) {
        console.warn('Coordonnées invalides pour Nominatim:', { 
          fullAddress, 
          rawData: data[0],
          latitude, 
          longitude 
        });
        return null;
      }
      
      // Vérification de la plage de coordonnées pour la France
      if (
        latitude < 41 || latitude > 51 || 
        longitude < -5 || longitude > 9
      ) {
        console.warn('Coordonnées hors de la zone France pour Nominatim:', { 
          fullAddress, 
          latitude, 
          longitude 
        });
        return null;
      }
      
      console.log('Géocodage réussi avec Nominatim pour:', {
        fullAddress,
        latitude,
        longitude,
        precision: data[0].type || 'inconnu'
      });
      
      return { latitude, longitude };
    }
    
    console.log('Géocodage échoué avec Nominatim pour:', fullAddress);
    return null;
  } catch (error) {
    console.error('Erreur lors du géocodage avec Nominatim:', error);
    return null;
  }
};

/**
 * Géocode une adresse avec l'API Mapbox
 * @param fullAddress Adresse complète à géocoder
 * @returns Coordonnées géographiques (latitude, longitude) ou null si le géocodage échoue
 */
const geocodeWithMapbox = async (
  fullAddress: string
): Promise<{latitude: number, longitude: number} | null> => {
  try {
    console.log('Tentative de géocodage avec Mapbox pour:', fullAddress);
    
    // Utiliser l'API Mapbox pour le géocodage
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${MAPBOX_API_KEY}&country=fr&limit=1&language=fr`
    );
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.features && data.features.length > 0) {
      const coordinates = data.features[0].center;
      const longitude = coordinates[0];
      const latitude = coordinates[1];
      
      // Validation supplémentaire des coordonnées
      if (isNaN(latitude) || isNaN(longitude)) {
        console.warn('Coordonnées invalides pour Mapbox:', { 
          fullAddress, 
          rawData: data.features[0],
          latitude, 
          longitude 
        });
        return null;
      }
      
      // Vérification de la plage de coordonnées pour la France
      if (
        latitude < 41 || latitude > 51 || 
        longitude < -5 || longitude > 9
      ) {
        console.warn('Coordonnées hors de la zone France pour Mapbox:', { 
          fullAddress, 
          latitude, 
          longitude 
        });
        return null;
      }
      
      console.log('Géocodage réussi avec Mapbox pour:', {
        fullAddress,
        latitude,
        longitude,
        precision: data.features[0].place_type ? data.features[0].place_type[0] : 'inconnu'
      });
      
      return {
        // Mapbox retourne les coordonnées au format [longitude, latitude]
        longitude,
        latitude
      };
    }
    
    console.log('Géocodage échoué avec Mapbox pour:', fullAddress);
    return null;
  } catch (error) {
    console.error('Erreur lors du géocodage avec Mapbox:', error);
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
): Promise<{latitude: number, longitude: number} | null> => {
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
      return geocodeCache[cacheKey];
    }
    
    // Essayer d'abord avec Nominatim
    let result = await geocodeWithNominatim(fullAddress);
    
    // Si Nominatim échoue, essayer avec Mapbox
    if (!result) {
      console.log('Nominatim a échoué, tentative avec Mapbox...');
      result = await geocodeWithMapbox(fullAddress);
    }
    
    // Si les deux API échouent, essayer avec une adresse simplifiée
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
        // Essayer d'abord avec Nominatim
        result = await geocodeWithNominatim(simpleAddress);
        
        // Si Nominatim échoue, essayer avec Mapbox
        if (!result) {
          console.log('Nominatim a échoué pour l\'adresse simplifiée, tentative avec Mapbox...');
          result = await geocodeWithMapbox(simpleAddress);
        }
        
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
    
    // Essayer d'abord avec Nominatim
    let result = await geocodeWithNominatim(fullAddress);
    
    // Si Nominatim échoue, essayer avec Mapbox
    if (!result) {
      console.log('Nominatim a échoué, tentative avec Mapbox...');
      result = await geocodeWithMapbox(fullAddress);
    }
    
    // Stocker le résultat dans le cache
    geocodeCache[cacheKey] = result;
    
    return result;
  } catch (error) {
    console.error('Erreur lors du géocodage:', error);
    return null;
  }
}; 