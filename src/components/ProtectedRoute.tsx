import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasPageAccess, PAGES, PageName } from '../utils/pageAccessUtils';
import { Role } from '../types/roles';
import { RoleService } from '../services/RoleService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userRole: string;
  allowedRoles: string[];
  requiredPermissions?: string[];
  pageName?: PageName;
  roles: Role[];
}

/**
 * Composant pour protéger les routes en fonction du rôle de l'utilisateur, des permissions et de l'accès aux pages
 * @param children - Le composant à afficher si l'utilisateur a accès
 * @param userRole - Le rôle de l'utilisateur actuel
 * @param allowedRoles - Les rôles autorisés à accéder à cette route
 * @param requiredPermissions - Les permissions requises pour accéder à cette route
 * @param pageName - Le nom de la page pour vérifier l'accès spécifique
 * @param roles - Liste des rôles disponibles
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  userRole, 
  allowedRoles,
  requiredPermissions = [],
  pageName,
  roles
}) => {
  const { currentUser, hasPermission, isAllowedRoute } = useAuth();
  const location = useLocation();
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  
  // Helper pour vérifier en toute sécurité l'accès à une page pour un rôle
  const checkPageAccess = (role: Role | undefined, page: PageName | undefined): boolean => {
    if (!role || !page) return false;
    
    if (role.isAdmin === true) return true;
    
    // Convertir pageName en clé de pageAccess de manière sûre
    const pageKey = page.toLowerCase() as keyof typeof role.pageAccess;
    return role.pageAccess?.[pageKey] === true;
  };
  
  useEffect(() => {
    // Vérifier si l'utilisateur a le rôle requis
    const hasRole = allowedRoles.includes(userRole) || allowedRoles.includes('default');
    
    // Vérifier si l'utilisateur a toutes les permissions requises
    const hasAllPermissions = requiredPermissions.length === 0 || 
      requiredPermissions.every(permission => hasPermission(permission));
      
    // Vérifier si l'utilisateur est autorisé à accéder à cette route
    const hasRouteAccess = isAllowedRoute(location.pathname);
    
    // Vérifier l'accès spécifique à la page si un nom de page est fourni
    const hasPageSpecificAccess = pageName 
      ? hasPageAccess(currentUser, pageName, roles) 
      : true;
    
    // Débogage avancé pour les problèmes d'accès
    console.log('VÉRIFICATION D\'ACCÈS DÉTAILLÉE:', {
      url: location.pathname,
      page: pageName,
      userRole: userRole,
      allowedRoles: allowedRoles,
      hasRole: hasRole,
      
      requiredPermissions: requiredPermissions,
      userPermissions: currentUser?.permissions || [],
      hasAllPermissions: hasAllPermissions,
      
      hasRouteAccess: hasRouteAccess,
      
      // Vérification spécifique de l'accès à la page
      pageAccessCheck: {
        pageName: pageName,
        allRoles: roles.map(r => ({name: r.name, pageAccess: r.pageAccess})),
        userRoleObject: roles.find(role => role.name === userRole),
        hasPageAccess: pageName ? checkPageAccess(roles.find(role => role.name === userRole), pageName) : true
      },
      
      hasPageSpecificAccess: hasPageSpecificAccess,
      
      currentUser: {
        ...currentUser,
        role: currentUser?.role
      }
    });
    
    console.log(`🔑 DÉCISION FINALE pour ${location.pathname} (${pageName || 'sans nom de page'}):`);
    console.log(`- Rôle autorisé: ${hasRole ? 'OUI' : 'NON'} (${userRole} dans [${allowedRoles.join(', ')}])`);
    console.log(`- Permissions requises: ${hasAllPermissions ? 'OUI' : 'NON'} (${requiredPermissions.join(', ')})`);
    console.log(`- Accès spécifique à la page: ${hasPageSpecificAccess ? 'OUI' : 'NON'}`);
    console.log(`- Route autorisée: ${hasRouteAccess ? 'OUI' : 'NON'}`);
    console.log(`- Résultat final: ${(hasRole && hasAllPermissions && hasPageSpecificAccess) || hasRouteAccess ? '✅ ACCÈS AUTORISÉ' : '❌ ACCÈS REFUSÉ'}`);
    
    // Si l'utilisateur a le rôle requis, toutes les permissions requises, accès à la route et accès à la page, accorder l'accès
    setHasAccess((hasRole && hasAllPermissions && hasPageSpecificAccess) || hasRouteAccess);
    setAccessChecked(true);
    
  }, [userRole, currentUser, location.pathname, roles, allowedRoles, requiredPermissions, pageName, hasPermission, isAllowedRoute]);
  
  // Attendre que la vérification d'accès soit terminée
  if (!accessChecked) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Vérification des permissions...</p>
      </div>
    );
  }
  
  // Si l'accès est accordé, afficher le composant enfant
  if (hasAccess) {
    return <>{children}</>;
  }

  // Pour que l'utilisateur puisse bien comprendre pourquoi l'accès est refusé
  console.log('ACCÈS REFUSÉ - Redirection vers la page d\'accueil');

  // Sinon, rediriger vers la page d'accueil
  return <Navigate to="/" replace />;
};

export default ProtectedRoute;
