export interface Tournee {
  id: string;
  nom: string;
  heureDepart: string;
  heureFinPrevue: string;
  heureFinReelle?: string;
  coursier: string;
  vehicule: string;
  nombreColis: number;
  statut: 'en_attente' | 'en_cours' | 'terminee' | 'annulee';
} 
