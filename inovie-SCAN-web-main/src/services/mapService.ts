import L from 'leaflet';
import { Site, SiteTournee, TourOptimization, RouteInfo } from '../types/tournees.types';

export const mapService = {
  // Calcule l'itinéraire entre plusieurs points
  async calculateRoute(sites: SiteTournee[]): Promise<{ distance: number; duration: number; routes: RouteInfo[] }> {
    // Version simplifiée sans dépendance à leaflet-routing-machine
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

    // Calculer des itinéraires directs entre chaque paire de points consécutifs
    for (let i = 0; i < sites.length - 1; i++) {
      const origin = sites[i].site;
      const destination = sites[i + 1].site;

      if (!origin || !destination) continue;

      // Calculer distance à vol d'oiseau et temps estimé
      const distance = this.calculateDistance(origin, destination);
      const duration = this.estimateTravelTime(origin, destination);

      totalDistance += distance;
      totalDuration += duration;

      // Encoder une ligne droite simple comme polyline (ce n'est pas un vrai encodage polyline)
      // Dans une vraie application, vous utiliseriez un vrai service d'itinéraire
      routes.push({
        distance,
        duration,
        polyline: `${origin.latitude},${origin.longitude}|${destination.latitude},${destination.longitude}`
      });
    }

    return {
      distance: totalDistance,
      duration: totalDuration,
      routes
    };
  },

  // Calcule la distance entre deux points
  calculateDistance(origin: Site, destination: Site): number {
    // Calcul de la distance à vol d'oiseau (formule de Haversine)
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = origin.latitude * Math.PI/180;
    const φ2 = destination.latitude * Math.PI/180;
    const Δφ = (destination.latitude - origin.latitude) * Math.PI/180;
    const Δλ = (destination.longitude - origin.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance en mètres
  },

  // Optimise l'ordre des sites pour minimiser la distance totale
  async optimizeTour(sites: Site[]): Promise<TourOptimization> {
    // Dans une implémentation réelle, vous feriez appel à une API comme OSRM, GraphHopper, etc.
    // Ici, nous simulons simplement une réponse d'optimisation

    return new Promise(resolve => {
      // Simulation de traitement d'optimisation
      setTimeout(() => {
        // Version simplifiée: nous gardons le même ordre
        // Dans une vraie implémentation, l'ordre serait déterminé par l'algorithme d'optimisation
        const sitesOrder = sites.map(site => site.id);

        // Simuler une légère réorganisation pour démonstration
        if (sites.length > 2) {
          // Échange aléatoire de deux sites (sauf le premier et le dernier)
          const idx1 = 1 + Math.floor(Math.random() * (sites.length - 2));
          let idx2 = 1 + Math.floor(Math.random() * (sites.length - 2));
          while (idx2 === idx1) {
            idx2 = 1 + Math.floor(Math.random() * (sites.length - 2));
          }
          
          const temp = sitesOrder[idx1];
          sitesOrder[idx1] = sitesOrder[idx2];
          sitesOrder[idx2] = temp;
        }

        resolve({
          sitesOrder,
          totalDistance: 45000, // 45 km en mètres (simulé)
          totalDuration: 3600, // 1 heure en secondes (simulé)
          routes: []
        });
      }, 1000);
    });
  },

  // Estime le temps de trajet entre deux sites
  estimateTravelTime(origin: Site, destination: Site): number {
    // Calcul de la distance
    const distance = this.calculateDistance(origin, destination);

    // Vitesse moyenne en mètres par seconde (60 km/h ~ 16.67 m/s)
    const averageSpeed = 16.67;
    
    // Estimation du temps en secondes (avec un facteur pour les détours)
    return (distance / averageSpeed) * 1.3;
  }
};