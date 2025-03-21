import { Role, User } from '../types/roles';

interface PageAccess {
  dashboard?: boolean;
  passages?: boolean;
  sites?: boolean;
  tournees?: boolean;
  vehicules?: boolean;
  carte?: boolean;
  userManagement?: boolean;
  administration?: boolean;
  passageDetails?: boolean;
  tourneeDetails?: boolean;
  vehiculesAdvanced?: boolean;
}

export type PageName = 
  | 'dashboard'
  | 'passages'
  | 'sites'
  | 'tournees'
  | 'vehicules'
  | 'carte'
  | 'userManagement'
  | 'administration'
  | 'passageDetails'
  | 'tourneeDetails'
  | 'vehiculesAdvanced';

export const PAGES = {
  DASHBOARD: 'dashboard',
  PASSAGES: 'passages',
  SITES: 'sites',
  TOURNEES: 'tournees',
  VEHICULES: 'vehicules',
  CARTE: 'carte',
  USER_MANAGEMENT: 'userManagement',
  ADMINISTRATION: 'administration',
  PASSAGE_DETAILS: 'passageDetails',
  TOURNEE_DETAILS: 'tourneeDetails',
  VEHICULES_ADVANCED: 'vehiculesAdvanced',
} as const;

export function hasPageAccess(user: User | null, page: PageName, roles: Role[]): boolean {
  if (!user) return false;

  const userRole = roles.find(role => role.name === user.role);
  if (!userRole) return false;

  // Si l'utilisateur est admin, accorder l'accès à toutes les pages
  if (userRole.isAdmin === true) return true;

  // Vérifier que pageAccess existe avant d'y accéder
  const pageAccess = userRole.pageAccess as PageAccess | undefined;
  if (!pageAccess) return false;
  
  return !!pageAccess[page];
}

export function getUserRoleDetails(user: User | null, roles: Role[]): Role | null {
  if (!user) return null;
  return roles.find(role => role.name === user.role) || null;
} 
