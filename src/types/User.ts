export interface User {
  id?: string;
  identifiant: string;
  email: string;
  nom: string;
  role: string;
  pole: string;
  statut: string;
  uid?: string;
  permissions: string[];
  dateCreation?: string;
  dateModification?: string;
} 
