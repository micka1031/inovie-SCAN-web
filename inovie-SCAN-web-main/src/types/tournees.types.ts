export interface Site {
    id: string;
    nom: string;
    adresse: string;
    ville: string;
    codePostal: string;
    latitude: number;
    longitude: number;
    // Autres propriétés potentielles
}

export interface SiteTournee {
    id: string; // référence au site dans la collection Sites
    ordre: number;
    heureArrivee: Date;
    site?: Site; // Optionnel: données complètes du site
}

export interface Tournee {
    id?: string;
    nom: string;
    pole: string; // référence à l'ID du pôle
    heureDebut: Date;
    heureFin: Date;
    sites: SiteTournee[];
    createdBy?: string;
    createdAt?: Date;
}

export interface RouteInfo {
    distance: number; // en mètres
    duration: number; // en secondes
    polyline: string; // format encodé pour affichage sur la carte
}

export interface TourOptimization {
    sitesOrder: string[]; // IDs des sites dans l'ordre optimisé
    totalDistance: number;
    totalDuration: number;
    routes: RouteInfo[];
}