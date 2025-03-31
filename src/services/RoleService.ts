import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Role } from '../types/roles';
import { PageName, PAGES } from '../utils/pageAccessUtils';

// Type d'événement pour les changements de rôles
type RoleChangeListener = () => void;

// Liste statique de rôles par défaut
export const roles: Role[] = [
  {
    id: 'utilisateur',
    name: 'Utilisateur',
    description: 'Utilisateur standard',
    permissions: ['basic.view'],
    pageAccess: {
      dashboard: true,
      passages: true,
      sites: true,
      tournees: true,
      vehicules: true,
      carte: true
    },
    isDefault: true
  },
  {
    id: 'admin',
    name: 'Administrateur',
    description: 'Administrateur système',
    permissions: ['*'], // Tous les permissions
    pageAccess: {
      dashboard: true,
      passages: true,
      sites: true,
      tournees: true,
      vehicules: true,
      carte: true,
      userManagement: true,
      administration: true
    },
    isAdmin: true
  },
  {
    id: 'manager',
    name: 'Gestionnaire',
    description: 'Gestionnaire de système',
    permissions: ['users.view', 'users.edit'],
    pageAccess: {
      dashboard: true,
      passages: true,
      sites: true,
      tournees: true,
      vehicules: true,
      carte: true,
      userManagement: true
    }
  }
];

export function getRoleByName(roleName: string): Role | undefined {
  // Essayer de récupérer d'abord depuis l'instance si elle existe
  try {
    const roleService = RoleService.getInstance();
    if (roleService["initialized"]) {
      // Accès à la propriété privée initialized via l'indexeur
      const roleFromService = roleService["roles"].find(role => role.name === roleName);
      if (roleFromService) {
        console.log(`🔍 Rôle '${roleName}' trouvé dans l'instance:`, roleFromService);
        return roleFromService;
      }
    }
  } catch (error) {
    console.warn(`Erreur lors de la récupération du rôle depuis l'instance:`, error);
  }
  
  // Fallback sur les rôles statiques
  const roleFromStatic = roles.find(role => role.name === roleName);
  console.log(`🔍 Rôle '${roleName}' ${roleFromStatic ? 'trouvé' : 'non trouvé'} dans les rôles statiques`);
  return roleFromStatic;
}

export function canAccessPage(roleName: string, pageName: PageName): boolean {
  const role = getRoleByName(roleName);
  
  if (!role) {
    console.warn(`Rôle '${roleName}' non trouvé pour vérifier l'accès à la page ${pageName}`);
    return false;
  }
  
  // Si c'est un admin, accès total
  if (role.isAdmin === true) {
    console.log(`👑 Rôle '${roleName}' est admin, accès accordé à ${pageName}`);
    return true;
  }
  
  // Vérification explicite pour chaque page
  const hasAccess = role.pageAccess?.[pageName] === true;
  console.log(`🔐 Vérification d'accès pour '${roleName}' à la page '${pageName}': ${hasAccess ? 'OUI' : 'NON'}`);
  console.log(`   - pageAccess pour ${pageName}:`, role.pageAccess?.[pageName]);
  
  return hasAccess;
}

export class RoleService {
  private static instance: RoleService;
  private roles: Role[] = [];
  private initialized = false;
  private roleChangeListeners: RoleChangeListener[] = [];

  private constructor() {}

  public static getInstance(): RoleService {
    if (!RoleService.instance) {
      RoleService.instance = new RoleService();
    }
    return RoleService.instance;
  }
  
  // Ajouter un écouteur pour les changements de rôles
  public addRoleChangeListener(listener: RoleChangeListener): void {
    this.roleChangeListeners.push(listener);
  }
  
  // Supprimer un écouteur
  public removeRoleChangeListener(listener: RoleChangeListener): void {
    this.roleChangeListeners = this.roleChangeListeners.filter(l => l !== listener);
  }
  
  // Notifier tous les écouteurs d'un changement de rôles
  private notifyRoleChangeListeners(): void {
    this.roleChangeListeners.forEach(listener => listener());
  }

  public async getRoles(): Promise<Role[]> {
    if (!this.initialized) {
      await this.initializeRoles();
    }
    return this.roles;
  }

  public async getRole(roleId: string): Promise<Role | null> {
    if (!this.initialized) {
      await this.initializeRoles();
    }
    return this.roles.find(role => role.id === roleId) || null;
  }

  public async getRoleByName(roleName: string): Promise<Role | null> {
    if (!this.initialized) {
      await this.initializeRoles();
    }
    return this.roles.find(role => role.name === roleName) || null;
  }

  private async initializeRoles() {
    try {
      const rolesCollection = collection(db, 'roles');
      const rolesSnapshot = await getDocs(rolesCollection);
      this.roles = rolesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Role));
      this.initialized = true;
      console.log('Roles initialisés:', this.roles);
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error);
      throw error;
    }
  }

  public async updateRolePermissions(roleId: string, permissions: string[]): Promise<void> {
    try {
      // S'assurer que le service est initialisé
      if (!this.initialized) {
        await this.initializeRoles();
      }

      console.log('RoleService: Début de la mise à jour des permissions pour le rôle:', roleId);
      console.log('RoleService: Nouvelles permissions:', permissions);

      // Vérifier si le rôle existe dans Firestore
      const roleRef = doc(db, 'roles', roleId);
      const roleDoc = await getDoc(roleRef);

      if (!roleDoc.exists()) {
        throw new Error(`Le rôle avec l'ID ${roleId} n'existe pas dans Firestore`);
      }

      // Mettre à jour le document dans Firestore
      await updateDoc(roleRef, {
        permissions: permissions
      });
      console.log('RoleService: Document mis à jour dans Firestore');

      // Mettre à jour le cache local
      const roleIndex = this.roles.findIndex(r => r.id === roleId);
      if (roleIndex !== -1) {
        this.roles[roleIndex] = {
          ...this.roles[roleIndex],
          permissions: permissions
        };
        console.log('RoleService: Cache local mis à jour');
      }

      // Rafraîchir les rôles depuis Firestore
      await this.refreshRoles();
      console.log('RoleService: Roles rafraîchis depuis Firestore');
      
      // Notifier les écouteurs du changement
      this.notifyRoleChangeListeners();
    } catch (error) {
      console.error('RoleService: Erreur lors de la mise à jour des permissions:', error);
      throw error;
    }
  }

  public async updatePageAccess(roleId: string, pageAccess: Role['pageAccess']): Promise<void> {
    try {
      // S'assurer que le service est initialisé
      if (!this.initialized) {
        await this.initializeRoles();
      }

      console.log('RoleService: Début de la mise à jour des accès aux pages pour le rôle:', roleId);
      console.log('RoleService: Nouveaux accès aux pages:', pageAccess);

      // Vérifier si le rôle existe dans Firestore
      const roleRef = doc(db, 'roles', roleId);
      const roleDoc = await getDoc(roleRef);

      if (!roleDoc.exists()) {
        throw new Error(`Le rôle avec l'ID ${roleId} n'existe pas dans Firestore`);
      }

      // Mettre à jour le document dans Firestore
      await updateDoc(roleRef, {
        pageAccess: pageAccess
      });
      console.log('RoleService: Document mis à jour dans Firestore');

      // Mettre à jour le cache local
      const roleIndex = this.roles.findIndex(r => r.id === roleId);
      if (roleIndex !== -1) {
        this.roles[roleIndex] = {
          ...this.roles[roleIndex],
          pageAccess: pageAccess
        };
        console.log('RoleService: Cache local mis à jour');
      }

      // Rafraîchir les rôles depuis Firestore
      await this.refreshRoles();
      console.log('RoleService: Roles rafraîchis depuis Firestore');
      
      // Forcer l'actualisation de tous les rôles statiques globaux
      Object.assign(roles, this.roles);
      
      // Notifier les écouteurs du changement
      this.notifyRoleChangeListeners();
    } catch (error) {
      console.error('RoleService: Erreur lors de la mise à jour des accès aux pages:', error);
      throw error;
    }
  }

  public async refreshRoles() {
    this.initialized = false;
    await this.initializeRoles();
    
    // Notifier les écouteurs du changement
    this.notifyRoleChangeListeners();
  }
} 
