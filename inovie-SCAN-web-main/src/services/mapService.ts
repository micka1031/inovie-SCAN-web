import L from 'leaflet';
import { Site, SiteTournee, TourOptimization, RouteInfo } from '../types/tournees.types';

/**
 * Service de fonctions utilitaires pour la manipulation de données géographiques
 * et le calcul d'itinéraires.
 */
export const mapService = {
  /**
   * Calcule la distance entre deux points géographiques en utilisant la formule de Haversine
   * @param lat1 Latitude du point 1
   * @param lon1 Longitude du point 1
   * @param lat2 Latitude du point 2
   * @param lon2 Longitude du point 2
   * @returns Distance en kilomètres
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la terre en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * 
      Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon / 2) * 
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance en km
    return distance;
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
   * Estime le temps de trajet entre deux sites en utilisant une vitesse moyenne
   * @param site1 Premier site
   * @param site2 Deuxième site
   * @param averageSpeed Vitesse moyenne en km/h (par défaut: 50 km/h)
   * @returns Temps estimé en secondes
   */
  estimateTravelTime(site1: Site, site2: Site, averageSpeed: number = 50): number {
    if (!site1.latitude || !site1.longitude || !site2.latitude || !site2.longitude) {
      throw new Error("Les coordonnées géographiques sont manquantes pour un ou plusieurs sites");
    }
    
    const distance = this.calculateDistance(
      site1.latitude, 
      site1.longitude, 
      site2.latitude, 
      site2.longitude
    );
    
    // Convertir la distance et la vitesse en mètres par seconde
    // distance (km) / vitesse (km/h) * 3600 = temps en secondes
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
      const distance = this.calculateDistance(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
      const duration = this.estimateTravelTime(origin, destination);

      totalDistance += distance;
      totalDuration += duration;

      // Créer les points d'itinéraire (ligne droite)
      const originPoint = { lat: origin.latitude, lng: origin.longitude };
      const destPoint = { lat: destination.latitude, lng: destination.longitude };
      
      routes.push({
        origin: originPoint,
        destination: destPoint,
        distance: distance * 1000, // en mètres
        duration: duration, // en secondes
        points: [originPoint, destPoint]
      });
    }

    return {
      distance: totalDistance * 1000, // convertir en mètres
      duration: totalDuration,
      routes
    };
  },

  // Optimise l'ordre des sites pour minimiser la distance totale
  async optimizeTour(sites: Site[]): Promise<TourOptimization> {
    // Dans une implémentation réelle, vous feriez appel à une API comme OSRM, GraphHopper, etc.
    // Ici, nous simulons simplement une réponse d'optimisation

    return new Promise(resolve => {
      // Simulation de traitement d'optimisation
      setTimeout(() => {
        // Version simplifiée: nous utilisons l'algorithme du plus proche voisin
        const sitesOrder = this.calculateOptimalRoute(sites);
        
        resolve({
          sitesOrder,
          totalDistance: 45000, // 45 km en mètres (simulé)
          totalDuration: 3600 // 1 heure en secondes (simulé)
        });
      }, 1000);
    });
  }
};