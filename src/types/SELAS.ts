/**
 * Interface représentant une SELAS (Société d'Exercice Libéral par Actions Simplifiée)
 */
export interface SELAS {
  id: string;
  nom: string;
  description: string;
  code: string;
  active: boolean;
  dateCreation?: string;
  dateModification?: string;
  accesPages: {
    dashboard: boolean;
    passages: boolean;
    sites: boolean;
    tournees: boolean;
    vehicules: boolean;
    map: boolean;
    userManagement: boolean;
    adminPanel: boolean;
  };
  sitesAutorises: string[]; // IDs des sites autorisés pour cette SELAS
}

/**
 * Interface pour la création d'une nouvelle SELAS sans ID
 */
export type SELASCreation = Omit<SELAS, 'id'>;

/**
 * Interface pour les statistiques d'une SELAS
 */
export interface SELASStats {
  id: string;
  nom: string;
  nbUtilisateurs: number;
  nbSites: number;
  nbPassages: number;
  nbTournees: number;
  nbVehicules: number;
} 
