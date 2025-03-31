import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'Utilisateur' | 'Administrateur';
  pole?: string;
  dateCreation: string;
  dernierAcces?: string;
}

export interface Passage {
  id: string;
  idColis: string;
  siteDepart: string;
  siteFin: string;
  dateHeureDepart: string;
  dateHeureFin?: string;
  statut: 'En attente' | 'En cours' | 'Livré' | 'Problème';
  tourneeId?: string;
  vehiculeId?: string;
  commentaire?: string;
}

export interface Site {
  id: string;
  pole: string;
  nom: string;
  type: string;
  adresse: string;
  ville: string;
  codePostal: string;
  telephone?: string;
  email?: string;
  codeBarres: string;
  tournees?: string[];
  codesPorte?: string;
  coordonnees?: string;
  statut: string;
  latitude?: number;
  longitude?: number;
  complementAdresse?: string;
  pays?: string;
  horairesLV?: string;
  horairesSamedi?: string;
  bassin?: string;
  mi?: string;
  ptRattachement?: string;
  srrRattachement?: string;
  hubLogistique?: string;
  siteLSEnregistrement?: string;
  srr?: string;
}

export interface Tournee {
  id: string;
  nom: string;
  codeBarres: string;
  pole: string;
  vehiculeId?: string;
  personne?: string;
  dateDebut: string;
  dateFin?: string;
  statut: string;
  commentaire?: string;
}

export interface Vehicule {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  type: string;
  annee: number;
  statut: 'actif' | 'maintenance' | 'inactif';
  dernierEntretien?: string;
  coursierAssigne?: string;
  kilometrage: number;
  pole?: string;
  dateCreation?: string;
  dateModification?: string;
}

/**
 * Formes de marqueurs disponibles pour Google Maps:
 * - circle: cercle
 * - square: carré
 * - triangle: triangle pointant vers le bas
 * - forward arrow: flèche pointant vers le haut
 * - open arrow: flèche ouverte
 * - backward open arrow: flèche arrière ouverte
 * - pin/droplet: épingle/goutte d'eau
 * - star: étoile
 * - diamond: losange
 * - hexagon: hexagone
 * - cross: croix
 */
export interface MarkerPreference {
  id: string;
  siteType: string;
  color: string;
  icon?: string;
  name: string;
  activity?: string;
  apercu?: string;
  order?: number;
  iconPath?: any;
  scale?: number;
}

