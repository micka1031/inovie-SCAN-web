export interface Site {
    id: string;
    nom: string;
    adresse: string;
    codePostal: string;
    ville: string;
    latitude: number;
    longitude: number;
}

export interface SiteTournee {
    id: string;  // ID unique généré (peut contenir un timestamp pour permettre les doublons)
    siteId?: string; // ID référençant le site original
    ordre: number;
    heureArrivee: Date;
    site?: Site; // Données complètes du site (optionnel, utilisé pour l'affichage)
}

export interface Tournee {
    id?: string;
    nom: string;
    pole: string;
    heureDebut: Date;
    heureFin: Date;
    sites: SiteTournee[];
    createdBy?: string;
    createdAt?: Date;
}

export interface RoutePoint {
    lat: number;
    lng: number;
}

export interface RouteInfo {
    origin: RoutePoint;
    destination: RoutePoint;
    distance: number; // en mètres
    duration: number; // en secondes
    points: RoutePoint[];
}

export interface TourOptimization {
    sitesOrder: string[];
    totalDistance: number;
    totalDuration: number;
}