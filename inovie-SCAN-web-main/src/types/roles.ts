export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  pageAccess?: {
    dashboard?: boolean;
    passages?: boolean;
    sites?: boolean;
    tournees?: boolean;
    vehicules?: boolean;
    carte?: boolean;
    userManagement?: boolean;
    administration?: boolean;
  };
  isDefault?: boolean;
  isAdmin?: boolean;
}

export interface User {
  id?: string;
  uid?: string;
  identifiant: string;
  email: string;
  nom: string;
  role: string;
  pole: string;
  statut: string;
  permissions: string[];
  dateCreation?: string;
  dateModification?: string;
} 
