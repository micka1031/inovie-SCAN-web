import { Role, User } from '../types/roles';

export const PAGES = {
  DASHBOARD: 'dashboard',
  PASSAGES: 'passages',
  PASSAGE_DETAILS: 'passageDetails',
  SITES: 'sites',
  TOURNEES: 'tournees',
  TOURNEE_DETAILS: 'tourneeDetails',
  VEHICULES: 'vehicules',
  VEHICULES_ADVANCED: 'vehiculesAdvanced',
  CARTE: 'carte',
  USER_MANAGEMENT: 'userManagement',
  ADMINISTRATION: 'administration'
} as const;

export type PageName = typeof PAGES[keyof typeof PAGES];

export function hasPageAccess(user: User | null, page: PageName, roles: Role[]): boolean {
  if (!user) return false;

  // Trouver le rôle de l'utilisateur
  const userRole = roles.find(role => role.name === user.role);
  
  console.log(`🔍 hasPageAccess - Vérification pour ${user.role} et page ${page}:`);
  console.log(`- Rôle trouvé: ${userRole ? 'OUI' : 'NON'}`);
  if (userRole) {
    console.log(`- isAdmin: ${userRole.isAdmin ? 'OUI' : 'NON'}`);
    console.log(`- pageAccess pour ${page}: ${userRole.pageAccess?.[page] === true ? 'OUI' : 'NON'}`);
    console.log(`- pageAccess complet:`, userRole.pageAccess);
  }
  
  // Si c'est un admin, accès total
  if (userRole?.isAdmin) return true;

  // Vérifier l'accès spécifique à la page
  return userRole?.pageAccess?.[page] === true;
}

export function getUserRoleDetails(user: User | null, roles: Role[]): Role | undefined {
  if (!user) return undefined;
  return roles.find(role => role.name === user.role);
} 