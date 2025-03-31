/**
 * Service pour interagir avec l'API Google Places
 */

import { mapService } from './mapService';

// Format des horaires d'ouverture
export interface OpeningHours {
  lundi: { ouverture: string; fermeture: string } | null;
  mardi: { ouverture: string; fermeture: string } | null;
  mercredi: { ouverture: string; fermeture: string } | null;
  jeudi: { ouverture: string; fermeture: string } | null;
  vendredi: { ouverture: string; fermeture: string } | null;
  samedi: { ouverture: string; fermeture: string } | null;
  dimanche: { ouverture: string; fermeture: string } | null;
  sourceMAJ: Date;
}

/**
 * Service pour récupérer les détails d'un lieu via l'API Google Places
 */
export const placesService = {
  /**
   * Recherche un lieu à partir d'une adresse et récupère ses détails, y compris les horaires d'ouverture
   * @param address Adresse complète du lieu
   * @returns Les horaires d'ouverture, ou null si impossible à récupérer
   */
  async getPlaceDetails(address: string): Promise<OpeningHours | null> {
    try {
      console.log('Recherche du lieu avec Google Places:', address);
      
      // S'assurer que l'API Google Maps est chargée
      await mapService.loadGoogleMapsAPI();
      
      // Vérifier si le service Places est disponible
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error('API Google Places non disponible');
        return null;
      }
      
      // Utiliser PlacesService avec une instance de Map
      return new Promise((resolve) => {
        // Créer une petite carte cachée pour utiliser le service Places
        const mapDiv = document.createElement('div');
        mapDiv.style.height = '1px';
        mapDiv.style.width = '1px';
        mapDiv.style.position = 'absolute';
        mapDiv.style.visibility = 'hidden';
        document.body.appendChild(mapDiv);
        
        // Créer une instance de Map
        const map = new window.google.maps.Map(mapDiv, {
          center: { lat: 0, lng: 0 },
          zoom: 1,
          disableDefaultUI: true
        });
        
        const placesService = new window.google.maps.places.PlacesService(map);
        
        // Effectuer une recherche textuelle pour trouver le lieu
        placesService.findPlaceFromQuery({
          query: address,
          fields: ['place_id', 'name', 'formatted_address']
        }, async (results, status) => {
          try {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
              console.log('Lieu trouvé:', results[0].name, results[0].place_id);
              
              // Maintenant récupérer les détails du lieu, y compris les horaires
              placesService.getDetails({
                placeId: results[0].place_id,
                fields: ['name', 'opening_hours', 'formatted_address']
              }, (place, detailsStatus) => {
                try {
                  // Nettoyer l'élément map
                  document.body.removeChild(mapDiv);
                  
                  if (detailsStatus === window.google.maps.places.PlacesServiceStatus.OK && place) {
                    if (place.opening_hours) {
                      console.log('Horaires récupérés:', place.opening_hours);
                      const formattedHours = this.formatGoogleOpeningHours(place.opening_hours);
                      resolve(formattedHours);
                    } else {
                      console.log('Pas d\'horaires disponibles pour ce lieu');
                      resolve(null);
                    }
                  } else {
                    console.error('Erreur lors de la récupération des détails du lieu:', detailsStatus);
                    resolve(null);
                  }
                } catch (error) {
                  console.error('Erreur inattendue lors du traitement des détails:', error);
                  if (document.body.contains(mapDiv)) {
                    document.body.removeChild(mapDiv);
                  }
                  resolve(null);
                }
              });
            } else {
              console.log('Aucun lieu trouvé pour cette adresse:', status);
              document.body.removeChild(mapDiv);
              resolve(null);
            }
          } catch (error) {
            console.error('Erreur inattendue lors de la recherche de lieu:', error);
            if (document.body.contains(mapDiv)) {
              document.body.removeChild(mapDiv);
            }
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Erreur lors de la recherche du lieu:', error);
      return null;
    }
  },
  
  /**
   * Recherche un lieu à partir de ses coordonnées géographiques
   * @param latitude Latitude du lieu
   * @param longitude Longitude du lieu
   * @returns Les horaires d'ouverture, ou null si impossible à récupérer
   */
  async getPlaceDetailsByCoordinates(latitude: number, longitude: number): Promise<OpeningHours | null> {
    try {
      console.log('Recherche du lieu par coordonnées:', latitude, longitude);
      
      // S'assurer que l'API Google Maps est chargée
      await mapService.loadGoogleMapsAPI();
      
      // Vérifier si le service Places est disponible
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error('API Google Places non disponible');
        return null;
      }
      
      // Utiliser une autre approche : recherche textuelle par coordonnées
      return new Promise((resolve) => {
        // Créer une petite carte visible dans le DOM pour la durée de l'opération
        const mapDiv = document.createElement('div');
        mapDiv.style.height = '200px';
        mapDiv.style.width = '200px';
        mapDiv.style.position = 'absolute';
        mapDiv.style.bottom = '-1000px'; // Hors de l'écran mais toujours rendu
        document.body.appendChild(mapDiv);
        
        // Créer une instance de Map avec des options réduites
        const map = new window.google.maps.Map(mapDiv, {
          center: { lat: latitude, lng: longitude },
          zoom: 15,
          disableDefaultUI: true,
          clickableIcons: false
        });
        
        // Attendre que la carte soit chargée
        map.addListener('idle', () => {
          try {
            const placesService = new window.google.maps.places.PlacesService(map);
            const location = new window.google.maps.LatLng(latitude, longitude);
            
            // Essayer textuellement avec les coordonnées
            placesService.textSearch({
              location: location,
              radius: 50,
              query: `${latitude},${longitude}`
            }, (results, status) => {
              try {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                  console.log('Lieu trouvé par recherche textuelle:', results[0].name);
                  
                  // Récupérer les détails du lieu
                  placesService.getDetails({
                    placeId: results[0].place_id,
                    fields: ['name', 'opening_hours', 'formatted_address']
                  }, (place, detailsStatus) => {
                    try {
                      // Nettoyer l'élément map
                      document.body.removeChild(mapDiv);
                      
                      if (detailsStatus === window.google.maps.places.PlacesServiceStatus.OK && place) {
                        if (place.opening_hours) {
                          console.log('Horaires récupérés:', place.opening_hours);
                          const formattedHours = this.formatGoogleOpeningHours(place.opening_hours);
                          resolve(formattedHours);
                        } else {
                          console.log('Pas d\'horaires disponibles pour ce lieu');
                          resolve(null);
                        }
                      } else {
                        console.error('Erreur lors de la récupération des détails du lieu:', detailsStatus);
                        resolve(null);
                      }
                    } catch (error) {
                      console.error('Erreur inattendue lors du traitement des détails:', error);
                      if (document.body.contains(mapDiv)) {
                        document.body.removeChild(mapDiv);
                      }
                      resolve(null);
                    }
                  });
                } else {
                  console.log('Aucun lieu trouvé par recherche textuelle, essai avec coordonnées précises');
                  
                  // Alternative: essayer avec findPlaceFromQuery
                  placesService.findPlaceFromQuery({
                    query: `${latitude},${longitude}`,
                    fields: ['place_id', 'name', 'formatted_address']
                  }, (places, findStatus) => {
                    try {
                      if (findStatus === window.google.maps.places.PlacesServiceStatus.OK && places && places.length > 0) {
                        console.log('Lieu trouvé par recherche de coordonnées:', places[0].name);
                        
                        // Récupérer les détails du lieu
                        placesService.getDetails({
                          placeId: places[0].place_id,
                          fields: ['name', 'opening_hours', 'formatted_address']
                        }, (placeDetails, placeStatus) => {
                          try {
                            // Nettoyer l'élément map
                            document.body.removeChild(mapDiv);
                            
                            if (placeStatus === window.google.maps.places.PlacesServiceStatus.OK && placeDetails) {
                              if (placeDetails.opening_hours) {
                                console.log('Horaires récupérés:', placeDetails.opening_hours);
                                const formattedHours = this.formatGoogleOpeningHours(placeDetails.opening_hours);
                                resolve(formattedHours);
                              } else {
                                console.log('Pas d\'horaires disponibles pour ce lieu');
                                resolve(null);
                              }
                            } else {
                              console.error('Erreur lors de la récupération des détails du lieu:', placeStatus);
                              resolve(null);
                            }
                          } catch (error) {
                            console.error('Erreur inattendue lors du traitement des détails:', error);
                            if (document.body.contains(mapDiv)) {
                              document.body.removeChild(mapDiv);
                            }
                            resolve(null);
                          }
                        });
                      } else {
                        console.log('Aucun lieu trouvé avec ces coordonnées par les deux méthodes');
                        document.body.removeChild(mapDiv);
                        resolve(null);
                      }
                    } catch (error) {
                      console.error('Erreur inattendue lors de la recherche findPlaceFromQuery:', error);
                      if (document.body.contains(mapDiv)) {
                        document.body.removeChild(mapDiv);
                      }
                      resolve(null);
                    }
                  });
                }
              } catch (error) {
                console.error('Erreur inattendue lors de la recherche textuelle:', error);
                if (document.body.contains(mapDiv)) {
                  document.body.removeChild(mapDiv);
                }
                resolve(null);
              }
            });
          } catch (error) {
            console.error('Erreur lors de l\'initialisation de la recherche:', error);
            if (document.body.contains(mapDiv)) {
              document.body.removeChild(mapDiv);
            }
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Erreur lors de la recherche du lieu par coordonnées:', error);
      return null;
    }
  },
  
  /**
   * Convertit les horaires d'ouverture de Google au format souhaité
   * @param googleHours Horaires d'ouverture au format Google
   * @returns Horaires d'ouverture au format souhaité
   */
  formatGoogleOpeningHours(googleHours: google.maps.places.OpeningHours): OpeningHours {
    // Initialiser des horaires vides
    const formattedHours: OpeningHours = {
      lundi: null,
      mardi: null,
      mercredi: null,
      jeudi: null,
      vendredi: null,
      samedi: null,
      dimanche: null,
      sourceMAJ: new Date()
    };
    
    // Vérifier si les périodes sont disponibles
    if (!googleHours.periods) {
      return formattedHours;
    }
    
    // Index des jours dans la semaine (0 = Dimanche, 1 = Lundi, etc.)
    const daysOfWeek = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    
    // Parcourir les périodes pour chaque jour
    for (const period of googleHours.periods) {
      if (period.open && period.close) {
        const dayIndex = period.open.day;
        const dayName = daysOfWeek[dayIndex];
        
        // Formater les heures (HH:MM)
        const openHour = period.open.hour.toString().padStart(2, '0');
        const openMinutes = period.open.minute.toString().padStart(2, '0');
        const closeHour = period.close.hour.toString().padStart(2, '0');
        const closeMinutes = period.close.minute.toString().padStart(2, '0');
        
        // Stocker les horaires formatés
        formattedHours[dayName] = {
          ouverture: `${openHour}:${openMinutes}`,
          fermeture: `${closeHour}:${closeMinutes}`
        };
      }
    }
    
    return formattedHours;
  }
}; 