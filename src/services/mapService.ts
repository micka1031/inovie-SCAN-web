import L from 'leaflet';
import { Site, SiteTournee, TourOptimization, RouteInfo } from '../types/tournees.types';

// Récupérer la clé API Google Maps depuis les variables d'environnement
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Types personnalisés pour la gestion des polylines
/* 
interface CustomPolyline {
  points: string;
}

interface CustomDirectionsRoute extends google.maps.DirectionsRoute {
  overview_polyline: CustomPolyline;
}

interface CustomDirectionsResult extends google.maps.DirectionsResult {
  routes: CustomDirectionsRoute[];
}
*/

/**
 * Service de fonctions utilitaires pour la manipulation de données géographiques
 * et le calcul d'itinéraires.
 */
export const mapService = {
  /**
   * Calcule la distance entre deux points géographiques en utilisant l'API Distance Matrix de Google Maps
   * @param lat1 Latitude du point 1
   * @param lon1 Longitude du point 1
   * @param lat2 Latitude du point 2
   * @param lon2 Longitude du point 2
   * @returns Distance en kilomètres
   */
  async calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): Promise<number> {
    try {
      // Vérifier si les points sont identiques
      if (lat1 === lat2 && lon1 === lon2) {
        console.log("Points identiques, distance = 0");
        return 0;
      }

      // Vérifier si l'API Google Maps est chargée
      if (!window.google?.maps?.DistanceMatrixService) {
        throw new Error("API Google Maps non chargée");
      }

      const distanceMatrixService = new google.maps.DistanceMatrixService();
      
      console.log(`Calcul de la distance entre (${lat1}, ${lon1}) et (${lat2}, ${lon2})`);
      
      const response = await new Promise<google.maps.DistanceMatrixResponse>((resolve, reject) => {
        distanceMatrixService.getDistanceMatrix({
          origins: [{ lat: lat1, lng: lon1 }],
          destinations: [{ lat: lat2, lng: lon2 }],
          travelMode: google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: google.maps.TrafficModel.BEST_GUESS
          }
        }, (result, status) => {
          if (status === google.maps.DistanceMatrixStatus.OK && result) {
            resolve(result);
          } else {
            reject(new Error(`Échec Distance Matrix: ${status}`));
          }
        });
      });

      // Vérifier la réponse
      if (!response.rows || response.rows.length === 0) {
        console.error("Réponse Distance Matrix vide:", response);
        throw new Error("Réponse Distance Matrix vide");
      }

      const element = response.rows[0]?.elements[0];
      if (!element) {
        console.error("Élément de distance non trouvé dans la réponse:", response);
        throw new Error("Élément de distance non trouvé dans la réponse");
      }

      if (element.status !== google.maps.DistanceMatrixElementStatus.OK) {
        console.error(`Statut de l'élément non OK: ${element.status}`);
        throw new Error(`Statut de l'élément non OK: ${element.status}`);
      }

      if (!element.distance?.value) {
        console.error("Distance non disponible dans l'élément:", element);
        throw new Error("Distance non disponible dans l'élément");
      }

      // Convertir les mètres en kilomètres
      const distanceInKm = element.distance.value / 1000;
      console.log(`Distance calculée: ${distanceInKm.toFixed(1)} km`);
      return distanceInKm;

    } catch (error) {
      console.error("Erreur lors du calcul de la distance:", error);
      throw error; // Propager l'erreur au lieu d'utiliser le fallback
    }
  },

  /**
   * Convertit des degrés en radians
   * @param deg Angle en degrés
   * @returns Angle en radians
   */
  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  },

  /**
   * Estime le temps de trajet entre deux sites en utilisant les conditions de trafic actuelles
   * @param site1 Premier site
   * @param site2 Deuxième site
   * @param departureTime Heure de départ (optionnel, utilise l'heure actuelle par défaut)
   * @returns Temps estimé en secondes
   */
  async estimateTravelTime(
    site1: Site, 
    site2: Site, 
    departureTime: Date = new Date()
  ): Promise<number> {
    // Vérifier les coordonnées
    const lat1 = Number(site1.latitude);
    const lng1 = Number(site1.longitude);
    const lat2 = Number(site2.latitude);
    const lng2 = Number(site2.longitude);
    
    if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
      throw new Error("Coordonnées invalides");
    }
    
    try {
      // Vérifier si l'API Google Maps est chargée
      if (!window.google?.maps?.DirectionsService) {
        throw new Error("API Google Maps non chargée");
      }
      
      const directionsService = new google.maps.DirectionsService();
      
      // S'assurer que le temps de départ est valide
      const effectiveDepartureTime = new Date(Math.max(
        departureTime.getTime(),
        Date.now()
      ));
      
      const response = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsService.route({
          origin: { lat: lat1, lng: lng1 },
          destination: { lat: lat2, lng: lng2 },
          travelMode: google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: effectiveDepartureTime,
            trafficModel: google.maps.TrafficModel.BEST_GUESS
          }
        }, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            resolve(result);
          } else {
            reject(new Error(`Échec directions: ${status}`));
          }
        });
      });
      
      if (response?.routes?.[0]?.legs?.[0]) {
        const leg = response.routes[0].legs[0];
        
        // Préférer la durée avec trafic si disponible
        const normalDuration = leg.duration.value;
        const trafficDuration = leg.duration_in_traffic?.value || normalDuration;
        const trafficRatio = trafficDuration / normalDuration;
        
        // Log uniquement si le trafic a un impact significatif
        if (trafficRatio > 1.1) {
          const trafficStatus = trafficRatio > 1.3 ? 'congestionné' : 'chargé';
          console.log(`Trafic détecté sur ${site1.nom} → ${site2.nom}: ${normalDuration/60} min → ${trafficDuration/60} min (${trafficStatus})`);
        }
        
        return trafficDuration;
      }
      
      throw new Error("Données d'itinéraire invalides");
      
    } catch (error) {
      console.error(`Erreur lors de l'estimation du temps de trajet:`, error);
      throw error;
    }
  },
  
  /**
   * Estime le temps de trajet à partir d'une distance
   * @param distance Distance en kilomètres
   * @returns Temps estimé en secondes
   */
  estimateTimeFromDistance(distance: number): number {
    // Vitesse moyenne de 50 km/h
    const averageSpeed = 50;
    return (distance / averageSpeed) * 3600;
  },

  /**
   * Calcule l'ordre optimal des sites pour minimiser la distance totale (problème du voyageur de commerce)
   * @param sites Liste des sites
   * @returns Ordre optimal des sites par ID
   */
  calculateOptimalRoute(sites: Site[]): string[] {
    if (sites.length <= 2) return sites.map(site => site.id);
    
    // Implémentation simple de l'algorithme du plus proche voisin
    const result: string[] = [];
    const unvisited = new Set(sites.map(site => site.id));
    
    // Commencer par le premier site
    let currentSiteId = sites[0].id;
    result.push(currentSiteId);
    unvisited.delete(currentSiteId);
    
    // Trouver le site non visité le plus proche à chaque étape
    while (unvisited.size > 0) {
      const currentSite = sites.find(site => site.id === currentSiteId)!;
      let minDistance = Infinity;
      let nextSiteId: string | null = null;
      
      // Parcourir tous les sites non visités
      for (const siteId of unvisited) {
        const site = sites.find(s => s.id === siteId)!;
        const distance = this.calculateDistance(
          currentSite.latitude!, 
          currentSite.longitude!, 
          site.latitude!, 
          site.longitude!
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nextSiteId = siteId;
        }
      }
      
      if (nextSiteId) {
        result.push(nextSiteId);
        unvisited.delete(nextSiteId);
        currentSiteId = nextSiteId;
      }
    }
    
    return result;
  },

  /**
   * Obtient la couleur d'un marqueur en fonction de sa position dans la tournée
   * @param index Position du site dans la tournée
   * @param total Nombre total de sites
   * @returns Code couleur au format hexadécimal
   */
  getMarkerColor(index: number, total: number): string {
    if (index === 0) return '#00796B'; // Vert pour le premier site
    if (index === total - 1) return '#D32F2F'; // Rouge pour le dernier site
    
    // Dégradé du bleu au orange pour les sites intermédiaires
    const ratio = index / (total - 1);
    const r = Math.round(25 + ratio * 210);
    const g = Math.round(118 - ratio * 40);
    const b = Math.round(210 - ratio * 160);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  },

  /**
   * Calcule l'itinéraire entre plusieurs points en utilisant Google Maps
   */
  async calculateRoute(sites: SiteTournee[]): Promise<{ distance: number; duration: number; routes: RouteInfo[] }> {
    if (sites.length < 2) {
      return {
        distance: 0,
        duration: 0,
        routes: []
      };
    }

    const routes: RouteInfo[] = [];
    let totalDistance = 0;
    let totalDuration = 0;

    try {
      // Charger l'API Google Maps si elle n'est pas déjà chargée
      await this.loadGoogleMapsAPI();
      
      // Traiter chaque segment d'itinéraire (entre deux sites consécutifs)
      for (let i = 0; i < sites.length - 1; i++) {
        const origin = sites[i].site;
        const destination = sites[i + 1].site;

        if (!origin || !destination || 
            !origin.latitude || !origin.longitude || 
            !destination.latitude || !destination.longitude) {
          console.warn(`Coordonnées manquantes pour le segment ${i} -> ${i+1}`);
          continue;
        }

        console.log(`Calcul d'itinéraire Google Maps entre ${origin.nom} et ${destination.nom}`);
        
        try {
          // Valider les coordonnées pour s'assurer qu'elles sont numériques
          const originCoords = {
            lat: Number(origin.latitude),
            lng: Number(origin.longitude)
          };
          
          const destCoords = {
            lat: Number(destination.latitude),
            lng: Number(destination.longitude)
          };
          
          // Vérifier que les coordonnées sont valides
          if (isNaN(originCoords.lat) || isNaN(originCoords.lng) || 
              isNaN(destCoords.lat) || isNaN(destCoords.lng)) {
            throw new Error('Coordonnées invalides');
          }
          
          // S'assurer que l'heure d'arrivée est une date valide pour le trajet précédent
          let departureTime = sites[i].heureArrivee;
          if (!(departureTime instanceof Date)) {
            departureTime = new Date(departureTime);
          }
          
          // Si la date n'est toujours pas valide, utiliser l'heure actuelle
          if (isNaN(departureTime.getTime())) {
            console.warn('Heure de départ invalide, utilisation de l\'heure actuelle');
            departureTime = new Date();
          }
          
          // Ajouter la durée de visite pour obtenir l'heure de départ réelle
          // Utiliser une durée par défaut de 5 minutes si non spécifiée
          const dureeVisite = sites[i].dureeVisite || 5;
          departureTime = new Date(departureTime.getTime() + dureeVisite * 60 * 1000);
          
          console.log(`Heure de départ pour le segment ${i}: ${departureTime.toLocaleTimeString()} (après ${dureeVisite} min d'arrêt)`);
          
          // Utiliser le service Directions de Google Maps
          let routeInfo: RouteInfo;
          
          const result = await this.getDirections(originCoords, destCoords, departureTime);
            
          if (result && result.routes && result.routes.length > 0) {
            const route = result.routes[0];
            const leg = route.legs[0];
            
            // Extraire distance et durée
            const routeDistance = leg.distance.value; // mètres
            const routeDuration = leg.duration.value; // secondes
            const routeDurationInTraffic = leg.duration_in_traffic?.value || routeDuration; // secondes
            
            // Utiliser directement les données de trafic de Google Maps
            let trafficStatus: 'fluide' | 'charge' = 'fluide';
            
            // Si duration_in_traffic est disponible et différent de duration, il y a du trafic
            if (leg.duration_in_traffic) {
              const trafficRatio = leg.duration_in_traffic.value / leg.duration.value;
              // Utiliser les données brutes de Google Maps pour déterminer l'état du trafic
              if (trafficRatio > 1) {
                trafficStatus = 'charge';
              }
            }
            
            // Log détaillé du trafic pour le debugging
            console.log(`État du trafic pour le trajet ${origin.nom} → ${destination.nom}:`, {
              duréeNormale: Math.round(routeDuration/60) + ' min',
              duréeAvecTrafic: Math.round(routeDurationInTraffic/60) + ' min',
              heureDépart: departureTime.toLocaleTimeString()
            });
            
            // Extraire les points du tracé
            let points: { lat: number, lng: number }[] = [];
            let polylineFound = false;
            
            try {
              if (route.overview_polyline && route.overview_polyline.points) {
                // Tenter de décoder le polyline
                console.log("Décodage du polyline...", route.overview_polyline.points.slice(0, 20) + "...");
                console.log("Type de polyline:", typeof route.overview_polyline.points);
                console.log("Existe et non vide:", !!route.overview_polyline.points && route.overview_polyline.points.length > 0);
                
                points = this.decodePolyline(route.overview_polyline.points);
                console.log(`Polyline décodé avec succès: ${points.length} points`);
                
                if (points.length >= 2) {
                  polylineFound = true;
                  console.log("Utilisation du polyline Google Maps pour le tracé routier");
                }
              }
              
              // Si pas de polyline valide, essayer l'API REST alternative
              if (!polylineFound) {
                // Nouvelle approche: Utiliser DirectionsRenderer pour obtenir le chemin exact
                console.log("Obtention du chemin précis via DirectionsRenderer");
                
                try {
                  // Réutiliser le résultat existant mais avec un nouveau service
                  const leg = route.legs[0];
                  if (leg && leg.steps && leg.steps.length > 0) {
                    points = [];
                    // Extraire tous les points de toutes les étapes
                    for (const step of leg.steps) {
                      // Essayer d'obtenir le path directement
                      if (step.path && step.path.length > 0) {
                        for (const pathPoint of step.path) {
                          points.push({
                            lat: pathPoint.lat(),
                            lng: pathPoint.lng()
                          });
                        }
                      } 
                      // Si path n'est pas disponible, essayer le polyline de l'étape
                      else if (step.polyline && step.polyline.points) {
                        const stepPoints = this.decodePolyline(step.polyline.points);
                        if (stepPoints.length > 0) {
                          points.push(...stepPoints);
                        }
                      }
                      // En dernier recours, utiliser les points de début et de fin
                      else if (step.start_location && step.end_location) {
                        points.push({
                          lat: step.start_location.lat(),
                          lng: step.start_location.lng()
                        });
                        points.push({
                          lat: step.end_location.lat(),
                          lng: step.end_location.lng()
                        });
                      }
                    }
                    
                    if (points.length >= 2) {
                      console.log(`Points extraits des étapes: ${points.length}`);
                      polylineFound = true;
                    }
                  }
                } catch (rendererError) {
                  console.error("Erreur lors de l'utilisation de DirectionsRenderer:", rendererError);
                }
              }
              
              // Si toujours pas de polyline valide, faire une dernière tentative directe
              if (!polylineFound) {
                console.log('Polyline manquant dans la réponse - Tentative alternative avec l\'API Google Maps Directions');
                
                // Essayer de contacter directement l'API Google Maps en dernier recours
                const altResult = await this.getDirectionsAlternative(originCoords, destCoords, departureTime);
                
                if (altResult.routes && altResult.routes.length > 0 && 
                    altResult.routes[0].overview_polyline && 
                    altResult.routes[0].overview_polyline.points &&
                    altResult.routes[0].overview_polyline.points.length > 0) {
                  
                  const altPoints = this.decodePolyline(altResult.routes[0].overview_polyline.points);
                  if (altPoints.length >= 2) {
                    points = altPoints;
                    polylineFound = true;
                    console.log(`Points obtenus directement de l'API: ${points.length}`);
                  } else {
                    throw new Error("API Directions - Pas assez de points pour tracer l'itinéraire");
                  }
                } else {
                  throw new Error("API Directions - Polyline manquant dans la réponse alternative");
                }
              }
            } catch (error) {
              console.error('Erreur lors du décodage du polyline:', error);
              throw new Error("Impossible d'obtenir un tracé routier valide");
            }
            
            // Couleur en fonction de l'état du trafic
            let trafficColor = '#2196F3'; // bleu pour fluide
            if (trafficStatus === 'charge') trafficColor = '#FF9800'; // orange pour chargé
            
            totalDistance += routeDistance;
            totalDuration += routeDurationInTraffic;
            
            routeInfo = {
              origin: originCoords,
              destination: destCoords,
              distance: routeDistance,
              duration: routeDurationInTraffic,
              points: points,
              trafficStatus,
              trafficColor,
              startTime: departureTime,
              endTime: new Date(departureTime.getTime() + routeDurationInTraffic * 1000),
              originalResponse: result
            };
          } else {
            throw new Error('Pas de route trouvée dans la réponse Google Maps');
          }
          
          routes.push(routeInfo);
          
          // Mettre à jour l'heure d'arrivée au site suivant
          if (i + 1 < sites.length && routeInfo) {
            const arrivalTime = new Date(departureTime.getTime() + routeInfo.duration * 1000);
            console.log(`Heure d'arrivée estimée à ${destination.nom}: ${arrivalTime.toLocaleTimeString()}`);
          }
          
        } catch (error) {
          console.error(`Erreur lors du traitement du segment ${i}:`, error);
          // Ne pas utiliser de solution de repli, propager l'erreur
          throw new Error(`Impossible de calculer l'itinéraire pour le segment ${i}: ${error.message}`);
        }
      }
      
      console.log(`Calcul d'itinéraire terminé: ${routes.length} segments, ${(totalDistance/1000).toFixed(1)} km, ${Math.round(totalDuration/60)} min`);
      
      return {
        distance: totalDistance,
        duration: totalDuration,
        routes
      };
      
    } catch (error) {
      console.error('Erreur globale lors du calcul d\'itinéraire:', error);
      // Ne pas utiliser de solution de repli, propager l'erreur
      throw new Error(`Impossible de calculer l'itinéraire complet: ${error.message}`);
    }
  },
  
  /**
   * Charge l'API Google Maps si elle n'est pas déjà chargée.
   * Retourne une promesse qui se résout lorsque l'API est chargée.
   */
  loadGoogleMapsAPI: (): Promise<void> => {
    console.log("Démarrage du chargement de l'API Google Maps");
    
    return new Promise((resolve, reject) => {
      // Vérifier si l'API Google Maps est déjà disponible
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log("L'API Google Maps est déjà chargée (avec la bibliothèque Places)");
        
        // Signaler que l'API est déjà disponible
        window.__googleMapsInitialized = true;
        window.dispatchEvent(new Event('google-maps-initialized'));
        
        resolve();
        return;
      } else if (window.google && window.google.maps && !window.google.maps.places) {
        console.log("L'API Google Maps est chargée mais sans la bibliothèque Places, rechargement...");
      }
      
      // Vérifier si le script est déjà en cours de chargement
      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        console.log("Le script Google Maps est déjà en cours de chargement");
        
        const onLoad = () => {
          console.log("L'API Google Maps a été chargée (via le script existant)");
          
          // Vérifier que les composants essentiels sont disponibles
          if (window.google && window.google.maps && window.google.maps.places) {
            window.__googleMapsInitialized = true;
            window.dispatchEvent(new Event('google-maps-initialized'));
            resolve();
          } else {
            const error = new Error("L'API Google Maps n'a pas été chargée correctement ou la bibliothèque Places est manquante");
            console.error(error);
            reject(error);
          }
        };
        
        const onError = () => {
          const error = new Error("Erreur lors du chargement de l'API Google Maps");
          console.error(error);
          reject(error);
        };
        
        // Ajouter des écouteurs d'événements au script existant
        existingScript.addEventListener('load', onLoad);
        existingScript.addEventListener('error', onError);
        
        return;
      }
      
      // Créer un nouvel élément script
      console.log("Création d'un nouveau script pour charger l'API Google Maps avec Places");
      const googleMapScript = document.createElement('script');
      googleMapScript.id = 'google-maps-script';
      googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
      googleMapScript.async = true;
      googleMapScript.defer = true;
      
      // Gérer le chargement réussi
      googleMapScript.addEventListener('load', () => {
        console.log("L'API Google Maps a été chargée avec succès");
        
        // Vérifier que les composants essentiels sont disponibles
        if (window.google && window.google.maps) {
          console.log("L'objet google.maps est disponible");
          
          // Vérifier que la bibliothèque Places est disponible
          if (window.google.maps.places) {
            console.log("La bibliothèque Places est disponible");
          } else {
            console.warn("La bibliothèque Places n'est pas disponible !");
          }
          
          // Initialiser le flag et dispatcher l'événement
          window.__googleMapsInitialized = true;
          window.dispatchEvent(new Event('google-maps-initialized'));
          
          // Ajouter un délai pour s'assurer que tout est bien initialisé
          setTimeout(() => {
            console.log("Confirmation finale de l'initialisation de Google Maps");
            window.dispatchEvent(new Event('google-maps-initialized'));
            resolve();
          }, 500);
        } else {
          const error = new Error("L'API Google Maps n'a pas été chargée correctement (objets manquants)");
          console.error(error);
          reject(error);
        }
      });
      
      // Gérer les erreurs de chargement
      googleMapScript.addEventListener('error', (error) => {
        console.error("Erreur lors du chargement du script Google Maps:", error);
        reject(new Error("Impossible de charger l'API Google Maps"));
      });
      
      // Ajouter le script à la page
      document.head.appendChild(googleMapScript);
    });
  },
  
  /**
   * Obtient un itinéraire via l'API Directions de Google Maps
   */
  getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    departureTime: Date
  ): Promise<google.maps.DirectionsResult> {
    // Utiliser directement l'API REST plutôt que le service JavaScript
    // Cela garantit que nous recevrons un polyline dans la réponse
    return this.getDirectionsAlternative(origin, destination, departureTime)
      .then(data => {
        // Convertir la réponse de l'API REST en format compatible avec DirectionsResult
        const result = this.convertRESTToDirectionsResult(data, origin, destination, departureTime);
        
        // Log des informations de trafic
        if (result.routes && result.routes.length > 0) {
          const route = result.routes[0];
          const leg = route.legs[0];
          if (leg.duration_in_traffic) {
            const normalDuration = leg.duration.value;
            const trafficDuration = leg.duration_in_traffic.value;
            const trafficRatio = trafficDuration / normalDuration;
            const trafficStatus = trafficRatio > 1.2 ? 'congestionné' : 
                                trafficRatio > 1.05 ? 'chargé' : 'fluide';
            console.log(`Trafic sur l'itinéraire: ${normalDuration/60} min → ${trafficDuration/60} min (${trafficStatus}, ratio: ${trafficRatio.toFixed(2)})`);
          }
        }
        
        return result;
      });
  },
  
  /**
   * Convertit la réponse de l'API REST Directions en format DirectionsResult
   */
  convertRESTToDirectionsResult(
    data: any, 
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    departureTime: Date
  ): google.maps.DirectionsResult {
    // Créer une structure de données compatible avec la DirectionsResult JavaScript API
    const result: any = {
      geocoded_waypoints: data.geocoded_waypoints,
      routes: [],
      request: {
        origin: origin,
        destination: destination,
        travelMode: "DRIVING",
        drivingOptions: {
          departureTime: departureTime
        }
      }
    };
    
    if (data.routes && data.routes.length > 0) {
      // Convertir la route
      const route = data.routes[0];
      const legs = route.legs.map((leg: any) => {
        // Convertir les étapes (steps) en format compatible
        const steps = leg.steps.map((step: any) => {
          return {
            distance: step.distance,
            duration: step.duration,
            end_location: new google.maps.LatLng(step.end_location.lat, step.end_location.lng),
            start_location: new google.maps.LatLng(step.start_location.lat, step.start_location.lng),
            instructions: step.html_instructions,
            travel_mode: step.travel_mode,
            polyline: step.polyline,
            path: step.polyline ? this.decodePolyline(step.polyline.points) : []
          };
        });
        
        // S'assurer que duration_in_traffic est correctement converti
        const durationInTraffic = leg.duration_in_traffic || leg.duration;
        
        // Calculer le ratio de trafic
        const trafficRatio = durationInTraffic.value / leg.duration.value;
        const trafficStatus = trafficRatio > 1 ? 'chargé' : 'fluide';
        
        console.log(`Trafic sur le trajet: ${leg.duration.value/60} min → ${durationInTraffic.value/60} min (${trafficStatus})`);
        
        return {
          distance: leg.distance,
          duration: leg.duration,
          duration_in_traffic: durationInTraffic,
          end_address: leg.end_address,
          end_location: new google.maps.LatLng(leg.end_location.lat, leg.end_location.lng),
          start_address: leg.start_address,
          start_location: new google.maps.LatLng(leg.start_location.lat, leg.start_location.lng),
          steps: steps
        };
      });
      
      result.routes = [{
        legs: legs,
        overview_polyline: route.overview_polyline,
        summary: route.summary,
        warnings: route.warnings,
        bounds: route.bounds,
        copyrights: route.copyrights
      }];
    }
    
    return result;
  },
  
  /**
   * Calcule un itinéraire de secours en cas d'échec de Google Maps
   */
  async calculateFallbackRoute(
    origin: Site, 
    destination: Site, 
    departureTime: Date
  ): Promise<RouteInfo> {
    console.error("Solution de repli désactivée - Tentative directe avec l'API");
    
    // Au lieu de créer une ligne droite, on tente une dernière fois avec l'API Directions
    try {
      if (!origin.latitude || !origin.longitude || !destination.latitude || !destination.longitude) {
        throw new Error("Coordonnées manquantes pour le calcul d'itinéraire");
      }
      
      const originCoords = { lat: origin.latitude, lng: origin.longitude };
      const destCoords = { lat: destination.latitude, lng: destination.longitude };
      
      // Utiliser l'API Directions directement
      const result = await this.getDirectionsAlternative(originCoords, destCoords, departureTime);
      
      if (result && result.routes && result.routes.length > 0) {
        const route = result.routes[0];
        const leg = route.legs[0];
        
        // Extraire les informations de distance et durée
        const distance = leg.distance.value;
        const duration = leg.duration.value;
        
        // Extraire les points du polyline
        let points: { lat: number, lng: number }[] = [];
        if (route.overview_polyline && route.overview_polyline.points) {
          points = this.decodePolyline(route.overview_polyline.points);
        }
        
        if (points.length < 2) {
          throw new Error("Pas assez de points pour tracer l'itinéraire");
        }
        
        return {
          origin: originCoords,
          destination: destCoords,
          distance: distance,
          duration: duration,
          points: points,
          trafficStatus: 'fluide',
          trafficColor: '#4CAF50'
        };
      }
      
      throw new Error("Aucun itinéraire trouvé");
    } catch (error) {
      console.error("Échec complet du calcul d'itinéraire:", error);
      throw new Error("Impossible de calculer un itinéraire entre les points");
    }
  },
  
  /**
   * Décode un polyline en utilisant directement la bibliothèque geometry de Google Maps
   * Cette méthode est plus fiable que les implémentations personnalisées
   */
  decodePolylineWithGoogle(encoded: string): { lat: number, lng: number }[] {
    if (!encoded || typeof encoded !== 'string') {
      console.warn('Polyline invalide reçu:', encoded);
      return [];
    }

    try {
      // Vérifier si la bibliothèque geometry est disponible
      if (!window.google || !window.google.maps || !window.google.maps.geometry) {
        console.warn('Bibliothèque geometry non disponible pour décoder le polyline');
        // Utiliser les méthodes alternatives
        return this.decodePolyline(encoded);
      }
      
      console.log("Décodage du polyline avec l'API Google Maps geometry");
      
      // Utiliser la fonction native de Google pour décoder
      const path = google.maps.geometry.encoding.decodePath(encoded);
      
      // Convertir le résultat en format compatible
      const points = path.map(point => ({
        lat: point.lat(),
        lng: point.lng()
      }));
      
      console.log(`Polyline décodé avec geometry.encoding.decodePath: ${points.length} points`);
      return points;
      
    } catch (err) {
      console.error('Erreur lors du décodage du polyline avec Google API:', err);
      // Utiliser les méthodes alternatives en cas d'erreur
      return this.decodePolyline(encoded);
    }
  },
  
  /**
   * Décode un polyline encodé par Google Maps selon l'algorithme officiel
   * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
   */
  decodePolyline(encoded: string): { lat: number, lng: number }[] {
    // Utiliser une fonction de décodage robuste et testée
    const polylinePts = [];
    const index = { i: 0 };
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    try {
      while (index.i < len) {
        let b;
        let shift = 0;
        let result = 0;

        do {
          b = encoded.charCodeAt(index.i++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);

        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;

        do {
          b = encoded.charCodeAt(index.i++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);

        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        polylinePts.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
      }
    } catch (error) {
      console.error('Erreur dans le décodage du polyline:', error);
      console.error('Polyline problématique:', encoded);
      // En cas d'erreur, on retourne au moins les points de départ et d'arrivée pour avoir un tracé minimal
      return [];
    }

    return polylinePts;
  },
  
  /**
   * Implémentation alternative pour décoder les polylines Google Maps
   */
  decodePolylineAlternative(encoded: string): { lat: number, lng: number }[] {
    if (!encoded || typeof encoded !== 'string') return [];
    
    try {
      let index = 0, lat = 0, lng = 0;
      const coordinates: { lat: number, lng: number }[] = [];
      const len = encoded.length;
      
      // Vérification simple du format de polyline (commence généralement par une lettre spécifique)
      if (len < 2) {
        return [];
      }
      
      while (index < len) {
        // Décodage de la latitude
        let shift = 0;
        let result = 0;
        
        do {
          if (index >= len) return coordinates;
          const char = encoded.charCodeAt(index) - 63;
          index++;
          result |= (char & 0x1f) << shift;
          shift += 5;
        } while (result & 0x20);
        
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        
        // Décodage de la longitude
        shift = 0;
        result = 0;
        
        do {
          if (index >= len) return coordinates;
          const char = encoded.charCodeAt(index) - 63;
          index++;
          result |= (char & 0x1f) << shift;
          shift += 5;
        } while (result & 0x20);
        
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        
        // Conversion des valeurs entières en coordonnées
        coordinates.push({
          lat: lat * 1e-5,
          lng: lng * 1e-5
        });
      }
      
      return coordinates;
    } catch (err) {
      console.error("Erreur dans l'implémentation alternative de décodage:", err);
      return [];
    }
  },

  // Calcul de secours pour les itinéraires (lignes droites)
  calculateSimpleRoute(sites: SiteTournee[]): { distance: number; duration: number; routes: RouteInfo[] } {
    console.error("Solution de repli par lignes droites désactivée");
    
    // Lever une exception plutôt que de générer des lignes droites
    throw new Error("Le calcul d'itinéraire simplifié est désactivé. Seuls les tracés routiers réels sont acceptés.");
  },

  // Génère des points intermédiaires pour simuler un itinéraire routier
  generateRoutePoints(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, numPoints: number): { lat: number; lng: number }[] {
    console.error("Génération de points intermédiaires désactivée - Seuls les tracés routiers réels sont acceptés");
    
    // Lever une exception plutôt que de générer des points factices
    throw new Error("La génération de points intermédiaires est désactivée. Seuls les tracés routiers réels sont acceptés.");
  },

  // Optimiser l'ordre des sites pour minimiser le temps de trajet en tenant compte du trafic réel
  async optimizeTour(sites: Site[], startTime: Date): Promise<TourOptimization> {
    if (sites.length <= 1) {
      return {
        sitesOrder: sites.map(site => site.id),
        totalDistance: 0,
        totalDuration: 0,
        arrivalTimes: {}
      };
    }

    try {
      console.log(`Optimisation de l'itinéraire pour ${sites.length} sites avec heure de départ: ${startTime.toLocaleString()}`);
      
      // Préserver le premier et dernier site
      const firstSite = sites[0];
      const lastSite = sites[sites.length - 1];
      
      // N'optimiser que les sites intermédiaires
      const intermediateSites = sites.slice(1, sites.length - 1);
      
      if (intermediateSites.length === 0) {
        // S'il n'y a que deux sites, pas besoin d'optimisation
        const distance = await this.calculateDistance(
          firstSite.latitude, 
          firstSite.longitude, 
          lastSite.latitude, 
          lastSite.longitude
        );
        
        const duration = await this.estimateTravelTime(firstSite, lastSite, startTime);
        
        return {
          sitesOrder: sites.map(site => site.id),
          totalDistance: distance * 1000, // en mètres
          totalDuration: duration, // en secondes
          arrivalTimes: {
            [firstSite.id]: startTime,
            [lastSite.id]: new Date(startTime.getTime() + duration * 1000)
          }
        };
      }
      
      // S'assurer que tous les sites ont des coordonnées valides
      const validIntermediateSites = intermediateSites.filter(site => {
        const lat = Number(site.latitude);
        const lng = Number(site.longitude);
        return !isNaN(lat) && !isNaN(lng) && site.id;
      });
      
      if (validIntermediateSites.length === 0) {
        throw new Error('Aucun site intermédiaire avec des coordonnées valides');
      }

      // Étape 1: Calculer la matrice des temps de trajet entre tous les sites
      console.log("Calcul des temps de trajet entre les sites...");
      const allValidSites = [firstSite, ...validIntermediateSites, lastSite];
      const sitesCount = allValidSites.length;
      const travelTimeMatrix: number[][] = [];
      const distanceMatrix: number[][] = [];
      
      // Utiliser l'heure de départ spécifiée comme base
      let matrixCurrentTime = new Date(startTime);
      
      for (let i = 0; i < sitesCount; i++) {
        travelTimeMatrix[i] = [];
        distanceMatrix[i] = [];
        for (let j = 0; j < sitesCount; j++) {
          if (i === j) {
            travelTimeMatrix[i][j] = 0;
            distanceMatrix[i][j] = 0;
          } else {
            // Calculer l'heure de départ en fonction de l'heure actuelle
            const departureTime = i === 0 ? new Date(startTime) : new Date(matrixCurrentTime);
            
            // Obtenir le temps de trajet avec trafic réel via Google Maps
            const travelTimeSeconds = await this.estimateTravelTime(
              allValidSites[i],
              allValidSites[j],
              departureTime
            );
            
            // Obtenir la distance réelle via Google Maps
            const distance = await this.calculateDistance(
              allValidSites[i].latitude,
              allValidSites[i].longitude,
              allValidSites[j].latitude,
              allValidSites[j].longitude
            );
            
            travelTimeMatrix[i][j] = travelTimeSeconds;
            distanceMatrix[i][j] = distance;
            
            // Log uniquement pour les trajets importants pour éviter de surcharger la console
            if (i === 0 || j === (sitesCount - 1)) {
              console.log(`Trajet ${allValidSites[i].nom} → ${allValidSites[j].nom}: ${Math.round(travelTimeSeconds/60)} min, ${distance.toFixed(1)} km (départ à ${departureTime.toLocaleTimeString()})`);
            }
          }
        }
      }
      
      console.log("Matrice des temps de trajet et distances calculée avec trafic réel");
      
      // Étape 2: Optimiser uniquement les sites intermédiaires
      // Si aucun site intermédiaire, retourner simplement l'ordre original
      if (validIntermediateSites.length <= 1) {
        const result = [firstSite.id];
        if (validIntermediateSites.length === 1) {
          result.push(validIntermediateSites[0].id);
        }
        if (lastSite.id !== firstSite.id) {
          result.push(lastSite.id);
        }
        
        // Calculer les heures d'arrivée
        const arrivalTimes: { [siteId: string]: Date } = {
          [firstSite.id]: new Date(startTime)
        };
        
        let simpleTourCurrentTime = new Date(startTime);
        // Ajouter 5 minutes de visite au premier site
        simpleTourCurrentTime = new Date(simpleTourCurrentTime.getTime() + 5 * 60 * 1000);
        
        for (let i = 1; i < result.length; i++) {
          const fromSite = allValidSites.find(s => s.id === result[i-1])!;
          const toSite = allValidSites.find(s => s.id === result[i])!;
          
          // Obtenir le temps de trajet réel avec le trafic actuel
          const travelTime = await this.estimateTravelTime(fromSite, toSite, simpleTourCurrentTime);
          
          // Ajouter le temps de trajet
          simpleTourCurrentTime = new Date(simpleTourCurrentTime.getTime() + travelTime * 1000);
          
          // Enregistrer l'heure d'arrivée
          arrivalTimes[toSite.id] = new Date(simpleTourCurrentTime);
          
          // Ajouter le temps de visite (5 minutes par défaut, sauf pour le dernier)
          if (i < result.length - 1) {
            simpleTourCurrentTime = new Date(simpleTourCurrentTime.getTime() + 5 * 60 * 1000);
          }
        }
        
        // Calculer la distance et la durée totales
        let totalDistance = 0;
        let totalDuration = 0;
        
        for (let i = 0; i < result.length - 1; i++) {
          const fromSite = allValidSites.find(s => s.id === result[i])!;
          const toSite = allValidSites.find(s => s.id === result[i+1])!;
          
          const distance = this.calculateDistance(
            fromSite.latitude, 
            fromSite.longitude, 
            toSite.latitude, 
            toSite.longitude
          );
          totalDistance += distance;
          
          const fromIndex = allValidSites.findIndex(s => s.id === fromSite.id);
          const toIndex = allValidSites.findIndex(s => s.id === toSite.id);
          
          totalDuration += travelTimeMatrix[fromIndex][toIndex];
        }
        
        return {
          sitesOrder: result,
          totalDistance: totalDistance * 1000, // en mètres
          totalDuration: totalDuration, // en secondes
          arrivalTimes: arrivalTimes
        };
      }
      
      // Optimisation par algorithme du plus proche voisin en utilisant les temps de trajet
      console.log("Optimisation des sites intermédiaires...");
      
      // Indices des sites intermédiaires dans la matrice des temps
      const intermediateIndices = Array.from({ length: validIntermediateSites.length }, 
        (_, i) => i + 1); // +1 car le premier site est déjà dans la matrice
      
      // Indice du premier site dans la matrice (toujours 0)
      const firstSiteIndex = 0;
      
      // Indice du dernier site dans la matrice (toujours le dernier)
      const lastSiteIndex = sitesCount - 1;
      
      // Stocker l'ordre optimal des indices
      const optimalOrder = [firstSiteIndex];
      
      // Ensemble des indices de sites intermédiaires non visités
      const unvisitedIndices = new Set(intermediateIndices);
      
      // Commencer depuis le premier site
      let currentSiteIndex = firstSiteIndex;
      
      // Trouver le meilleur ordre pour les sites intermédiaires
      while (unvisitedIndices.size > 0) {
        let minTravelTime = Infinity;
        let nextSiteIndex = -1;
        
        // Trouver le site non visité avec le temps de trajet le plus court
        for (const index of unvisitedIndices) {
          const travelTime = travelTimeMatrix[currentSiteIndex][index];
          
          if (travelTime < minTravelTime) {
            minTravelTime = travelTime;
            nextSiteIndex = index;
          }
        }
        
        if (nextSiteIndex !== -1) {
          optimalOrder.push(nextSiteIndex);
          unvisitedIndices.delete(nextSiteIndex);
          currentSiteIndex = nextSiteIndex;
        } else {
          console.error("Erreur d'optimisation: aucun site suivant trouvé");
          break;
        }
      }
      
      // Ajouter le dernier site
      optimalOrder.push(lastSiteIndex);
      
      // Convertir les indices en IDs de sites
      const optimalSitesOrder = optimalOrder.map(index => allValidSites[index].id);
      
      // Étape 3: Calculer les heures d'arrivée précises avec trafic réel
      console.log("Calcul des heures d'arrivée avec trafic réel...");
      const arrivalTimes: { [siteId: string]: Date } = {};
      
      // Heure de départ au premier site
      let tourCurrentTime = new Date(startTime);
      arrivalTimes[firstSite.id] = new Date(tourCurrentTime);
      
      // Pour chaque segment du trajet optimisé
      for (let i = 0; i < optimalOrder.length - 1; i++) {
        const fromSiteIndex = optimalOrder[i];
        const toSiteIndex = optimalOrder[i + 1];
        
        const fromSite = allValidSites[fromSiteIndex];
        const toSite = allValidSites[toSiteIndex];
        
        // Ajouter d'abord le temps de visite du site précédent (5 minutes par défaut)
        // sauf pour le dernier site
        if (i < optimalOrder.length - 2) {
          tourCurrentTime = new Date(tourCurrentTime.getTime() + 5 * 60 * 1000);
        }
        
        // Obtenir le temps de trajet réel avec le trafic à cette heure
        const realTravelTime = await this.estimateTravelTime(fromSite, toSite, tourCurrentTime);
        
        // Ajouter le temps de trajet
        tourCurrentTime = new Date(tourCurrentTime.getTime() + realTravelTime * 1000);
        
        // Enregistrer l'heure d'arrivée
        arrivalTimes[toSite.id] = new Date(tourCurrentTime);
        
        // Log uniquement pour certains trajets importants
        if (i === 0 || i === optimalOrder.length - 2) {
          console.log(`Arrivée à ${toSite.nom} à ${tourCurrentTime.toLocaleTimeString()} (trajet: ${Math.round(realTravelTime/60)} min)`);
        }
      }
      
      // Calculer la distance et la durée totales
      let totalDistance = 0;
      let totalDuration = 0;
      
      for (let i = 0; i < optimalOrder.length - 1; i++) {
        const fromSiteIndex = optimalOrder[i];
        const toSiteIndex = optimalOrder[i + 1];
        
        totalDistance += distanceMatrix[fromSiteIndex][toSiteIndex];
        totalDuration += travelTimeMatrix[fromSiteIndex][toSiteIndex];
      }
      
      console.log(`Optimisation terminée - ${optimalSitesOrder.length} sites, ${totalDistance.toFixed(1)} km, ${Math.round(totalDuration/60)} min`);
      
      // Vérifier que les premier et dernier sites sont bien préservés
      if (optimalSitesOrder[0] !== firstSite.id || optimalSitesOrder[optimalSitesOrder.length-1] !== lastSite.id) {
        console.error("Erreur: les sites de départ et d'arrivée ne sont pas préservés dans l'ordre optimisé");
      }
      
      return {
        sitesOrder: optimalSitesOrder,
        totalDistance: totalDistance * 1000, // en mètres
        totalDuration: totalDuration, // en secondes
        arrivalTimes: arrivalTimes
      };
      
    } catch (error) {
      console.error("Erreur lors de l'optimisation de l'itinéraire:", error);
      
      // En cas d'erreur, revenir à une implémentation de base
      console.log("Utilisation de l'algorithme de secours sans données de trafic");
      
      // Calculer un ordre optimal en préservant le premier et dernier site
      const firstSite = sites[0];
      const lastSite = sites[sites.length - 1];
      
      return this.calculateOptimalRouteWithFixedEnds(sites, startTime, firstSite.id, lastSite.id);
    }
  },

  // Version simplifiée de l'optimisation qui préserve les sites de départ et d'arrivée
  calculateOptimalRouteWithFixedEnds(sites: Site[], startTime: Date, firstSiteId: string, lastSiteId: string): TourOptimization {
    if (sites.length <= 2) {
      const result = sites.map(site => site.id);
      
      // Calculer les heures d'arrivée
      const arrivalTimes: { [siteId: string]: Date } = {
        [sites[0].id]: new Date(startTime)
      };
      
      // S'il y a un deuxième site, calculer son heure d'arrivée
      if (sites.length > 1) {
        const travelTimeSeconds = this.estimateTimeFromDistance(
          this.calculateDistance(
            sites[0].latitude,
            sites[0].longitude,
            sites[1].latitude,
            sites[1].longitude
          )
        );
        
        const arrivalTime = new Date(startTime.getTime() + travelTimeSeconds * 1000);
        arrivalTimes[sites[1].id] = arrivalTime;
      }
      
      return {
        sitesOrder: result,
        totalDistance: sites.length > 1 ? this.calculateDistance(
          sites[0].latitude,
          sites[0].longitude,
          sites[1].latitude,
          sites[1].longitude
        ) * 1000 : 0,
        totalDuration: sites.length > 1 ? this.estimateTimeFromDistance(
          this.calculateDistance(
            sites[0].latitude,
            sites[0].longitude,
            sites[1].latitude,
            sites[1].longitude
          )
        ) : 0,
        arrivalTimes: arrivalTimes
      };
    }
    
    // Trouver les sites de départ et d'arrivée
    const firstSite = sites.find(site => site.id === firstSiteId) || sites[0];
    const lastSite = sites.find(site => site.id === lastSiteId) || sites[sites.length - 1];
    
    // Extraire les sites intermédiaires (tous les sites sauf départ et arrivée)
    const intermediateSites = sites.filter(site => 
      site.id !== firstSite.id && site.id !== lastSite.id
    );
    
    // Résultat de l'optimisation
    const result: string[] = [firstSite.id];
    
    // Sites restants à visiter
    const unvisited = new Set(intermediateSites.map(site => site.id));
    
    // Position actuelle
    let currentSite = firstSite;
    let fallbackCurrentTime = new Date(startTime);
    
    // Stocker les heures d'arrivée
    const arrivalTimes: { [siteId: string]: Date } = {
      [firstSite.id]: new Date(startTime)
    };
    
    // Optimisation par plus proche voisin
    while (unvisited.size > 0) {
      let minDistance = Infinity;
      let closestSiteId: string | null = null;
      
      // Trouver le site le plus proche
      for (const siteId of unvisited) {
        const site = sites.find(s => s.id === siteId);
        if (!site) continue;
        
        const distance = this.calculateDistance(
          currentSite.latitude,
          currentSite.longitude,
          site.latitude,
          site.longitude
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestSiteId = siteId;
        }
      }
      
      if (closestSiteId) {
        // Ajouter le site le plus proche au résultat
        result.push(closestSiteId);
        unvisited.delete(closestSiteId);
        
        // Mettre à jour la position actuelle
        currentSite = sites.find(s => s.id === closestSiteId)!;
        
        // Ajouter d'abord 5 minutes de temps de visite
        fallbackCurrentTime = new Date(fallbackCurrentTime.getTime() + 5 * 60 * 1000);
        
        // Calculer le temps de trajet (50 km/h en moyenne)
        const travelTimeSeconds = this.estimateTimeFromDistance(minDistance);
        
        // Ajouter le temps de trajet
        fallbackCurrentTime = new Date(fallbackCurrentTime.getTime() + travelTimeSeconds * 1000);
        
        // Stocker l'heure d'arrivée
        arrivalTimes[closestSiteId] = new Date(fallbackCurrentTime);
      } else {
        break;
      }
    }
    
    // Ajouter le dernier site
    if (lastSite.id !== result[result.length - 1]) {
      result.push(lastSite.id);
      
      // Calculer la distance au dernier site
      const distance = this.calculateDistance(
        currentSite.latitude,
        currentSite.longitude,
        lastSite.latitude,
        lastSite.longitude
      );
      
      // Ajouter d'abord 5 minutes de temps de visite au site précédent
      fallbackCurrentTime = new Date(fallbackCurrentTime.getTime() + 5 * 60 * 1000);
      
      // Calculer le temps de trajet (50 km/h en moyenne)
      const travelTimeSeconds = this.estimateTimeFromDistance(distance);
      
      // Ajouter le temps de trajet
      fallbackCurrentTime = new Date(fallbackCurrentTime.getTime() + travelTimeSeconds * 1000);
      
      // Stocker l'heure d'arrivée du dernier site
      arrivalTimes[lastSite.id] = new Date(fallbackCurrentTime);
    }
    
    // Calculer la distance et la durée totales
    let totalDistance = 0;
    let totalDuration = 0;
    
    for (let i = 0; i < result.length - 1; i++) {
      const site1 = sites.find(s => s.id === result[i])!;
      const site2 = sites.find(s => s.id === result[i + 1])!;
      
      const distance = this.calculateDistance(
        site1.latitude,
        site1.longitude,
        site2.latitude,
        site2.longitude
      );
      
      totalDistance += distance;
      
      // Estimer la durée avec une vitesse moyenne de 50 km/h
      const duration = this.estimateTimeFromDistance(distance);
      totalDuration += duration;
    }
    
    return {
      sitesOrder: result,
      totalDistance: totalDistance * 1000, // en mètres
      totalDuration: totalDuration, // en secondes
      arrivalTimes: arrivalTimes
    };
  },

  /**
   * Méthode alternative pour obtenir les itinéraires directement via l'API REST
   * Peut résoudre les problèmes de polyline
   */
  async getDirectionsAlternative(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    departureTime: Date
  ): Promise<any> {
    try {
      // Utiliser DirectionsService de Google Maps directement
      console.log('Obtention des directions via DirectionsService');
      
      return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps || !window.google.maps.DirectionsService) {
          console.error('API Google Maps non chargée pour getDirectionsAlternative');
          return reject(new Error('API Google Maps non chargée'));
        }
        
        const directionsService = new google.maps.DirectionsService();
        
        // Vérifier que les coordonnées sont valides
        if (!isFinite(origin.lat) || !isFinite(origin.lng) ||
            !isFinite(destination.lat) || !isFinite(destination.lng) ||
            origin.lat < -90 || origin.lat > 90 || origin.lng < -180 || origin.lng > 180 ||
            destination.lat < -90 || destination.lat > 90 || destination.lng < -180 || destination.lng > 180) {
          console.error('Coordonnées invalides pour le calcul d\'itinéraire');
          return reject(new Error('Coordonnées invalides'));
        }

        // S'assurer que l'heure de départ est valide
        const now = new Date();
        const effectiveDepartureTime = departureTime < now ? now : departureTime;
        
        console.log(`Calcul d'itinéraire avec départ à ${effectiveDepartureTime.toLocaleString()}`);
        
        const request = {
          origin: origin,
          destination: destination,
          travelMode: google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: effectiveDepartureTime,
            trafficModel: google.maps.TrafficModel.BEST_GUESS
          },
          provideRouteAlternatives: false,
          avoidHighways: false,
          avoidTolls: false,
          optimizeWaypoints: false
        };
        
        directionsService.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            // Log des informations de trafic
            if (result.routes && result.routes.length > 0) {
              const route = result.routes[0];
              const leg = route.legs[0];
              if (leg.duration_in_traffic) {
                const normalDuration = leg.duration.value;
                const trafficDuration = leg.duration_in_traffic.value;
                const trafficRatio = trafficDuration / normalDuration;
                const trafficStatus = trafficRatio > 1 ? 'chargé' : 'fluide';
                console.log(`Trafic sur l'itinéraire: ${normalDuration/60} min → ${trafficDuration/60} min (${trafficStatus})`);
              }
            }
            resolve(result);
          } else {
            reject(new Error(`Erreur de direction: ${status}`));
          }
        });
      });
    } catch (error) {
      console.error('Erreur lors de l\'obtention des directions:', error);
      throw error;
    }
  },
  
  /**
   * Convertit le format DirectionsResult en format compatible avec l'API REST
   */
  convertDirectionsResultToREST(result: google.maps.DirectionsResult): any {
    // S'assurer que le résultat est valide
    if (!result || !result.routes || result.routes.length === 0) {
      return { status: "ZERO_RESULTS", routes: [] };
    }
    
    // Convertir la première route
    const route = result.routes[0];
    
    // Créer une structure de données similaire à celle renvoyée par l'API REST
    const restResult: any = {
      status: "OK",
      geocoded_waypoints: result.geocoded_waypoints || [],
      routes: [{
        summary: route.summary || "",
        legs: route.legs.map(leg => ({
          distance: leg.distance,
          duration: leg.duration,
          duration_in_traffic: leg.duration_in_traffic,
          end_address: leg.end_address,
          end_location: {
            lat: leg.end_location.lat(),
            lng: leg.end_location.lng()
          },
          start_address: leg.start_address,
          start_location: {
            lat: leg.start_location.lat(),
            lng: leg.start_location.lng()
          },
          steps: leg.steps.map(step => ({
            distance: step.distance,
            duration: step.duration,
            end_location: {
              lat: step.end_location.lat(),
              lng: step.end_location.lng()
            },
            start_location: {
              lat: step.start_location.lat(),
              lng: step.start_location.lng()
            },
            html_instructions: step.instructions,
            travel_mode: step.travel_mode,
            polyline: step.polyline || { points: "" }
          }))
        })),
        overview_polyline: route.overview_polyline || { points: "" },
        warnings: route.warnings || [],
        bounds: {
          northeast: {
            lat: route.bounds?.getNorthEast().lat() || 0,
            lng: route.bounds?.getNorthEast().lng() || 0
          },
          southwest: {
            lat: route.bounds?.getSouthWest().lat() || 0,
            lng: route.bounds?.getSouthWest().lng() || 0
          }
        },
        copyrights: route.copyrights || ""
      }]
    };
    
    return restResult;
  }
};