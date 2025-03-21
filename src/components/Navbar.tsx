import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logoInovieWhite from '../assets/logo-inovie-white.png';
import './Navbar.css';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { generateTempPassword } from '../services/userService';
import { sendPasswordResetEmail } from 'firebase/auth';
import { RoleService, canAccessPage, getRoleByName } from '../services/RoleService';
import { PAGES } from '../utils/pageAccessUtils';
import SELASSelector from './SELASSelector';
import { 
  ListAlt, 
  LocalShipping, 
  DirectionsCar, 
  LocationOn, 
  People
} from '@mui/icons-material';

interface NavbarProps {
  user: {
    nom?: string;
    role?: string;
    email?: string;
    id?: string;
  };
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = user?.role || '';
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // State pour les accès aux pages
  const [pageAccess, setPageAccess] = useState({
    dashboard: false,
    passages: false,
    sites: false,
    tournees: false,
    vehicules: false,
    map: false,
    userManagement: false,
    adminPanel: false
  });
  
  // Log pour debug
  console.log("👤 Informations utilisateur dans Navbar:", {
    nom: user?.nom,
    role: userRole,
    email: user?.email,
    id: user?.id,
    user: user
  });
  
  // Effet pour vérifier le rôle au montage du composant
  useEffect(() => {
    if (user && !user.role) {
      console.error("⚠️ Attention: L'utilisateur n'a pas de rôle défini!", user);
    } else if (user) {
      console.log("✅ Rôle utilisateur dans Navbar:", user.role);
    }
    
    // Cas spécial pour Mickaël Volle
    if (user?.email?.toLowerCase() === 'mickael.volle@inovie.fr' && user.role !== 'Administrateur') {
      console.warn("⚠️ Mickaël Volle n'a pas le rôle Administrateur!");
    }
  }, [user]);
  
  // Charger les rôles au démarrage
  useEffect(() => {
    const loadRoles = async () => {
      try {
        setLoading(true);
        const roleService = RoleService.getInstance();
        const fetchedRoles = await roleService.getRoles();
        setRoles(fetchedRoles);
        console.log('Navbar: Rôles chargés:', fetchedRoles);
        
        // Mettre à jour les accès aux pages
        setPageAccess({
          dashboard: canAccessPage(userRole, PAGES.DASHBOARD),
          passages: canAccessPage(userRole, PAGES.PASSAGES),
          sites: canAccessPage(userRole, PAGES.SITES),
          tournees: canAccessPage(userRole, PAGES.TOURNEES),
          vehicules: canAccessPage(userRole, PAGES.VEHICULES),
          map: canAccessPage(userRole, PAGES.CARTE),
          userManagement: canAccessPage(userRole, PAGES.USER_MANAGEMENT),
          adminPanel: canAccessPage(userRole, PAGES.ADMINISTRATION)
        });
      } catch (error) {
        console.error('Erreur lors du chargement des rôles:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadRoles();
    
    // Écouter les changements de rôles
    const roleService = RoleService.getInstance();
    const handleRoleChange = () => {
      console.log('Navbar: Changement de rôles détecté, rechargement...');
      loadRoles();
    };
    
    roleService.addRoleChangeListener(handleRoleChange);
    
    return () => {
      roleService.removeRoleChangeListener(handleRoleChange);
    };
  }, [userRole]);
  
  // Obtenir le nom formaté correctement
  const getUserDisplayName = () => {
    // Cas spécial pour Mickaël Volle
    if (user?.email?.toLowerCase() === 'mickael.volle@inovie.fr') {
      return 'Mickaël Volle';
    }
    
    return user?.nom || 'Utilisateur';
  };
  
  // Logs détaillés spécifiquement pour l'accès à la gestion des utilisateurs
  console.log(`🔑 ACCÈS GESTION UTILISATEURS DÉTAILS:`, {
    role: userRole,
    userManagementAccess: pageAccess.userManagement,
    canAccessUserManagement: canAccessPage(userRole, PAGES.USER_MANAGEMENT),
    roleInRoleService: getRoleByName(userRole),
    allRoles: roles,
    rolesArray: Array.isArray(roles),
    rolesLength: roles.length,
    pageAccessKey: PAGES.USER_MANAGEMENT
  });
  
  // Logs de débogage pour les accès
  useEffect(() => {
    console.log('🔑 Navbar - Accès aux pages pour', userRole, ':', pageAccess);
  }, [userRole, pageAccess]);
  
  // Fermer le menu lorsqu'on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Fonction pour gérer la déconnexion de manière plus réactive
  const handleLogout = () => {
    // Fermer le menu utilisateur
    setShowUserMenu(false);
    
    // Afficher un indicateur de chargement ou une notification si nécessaire
    // (optionnel, mais peut améliorer l'expérience utilisateur)
    
    console.log("Déconnexion initiée...");
    
    // Déclencher la déconnexion
    onLogout();
    
    // Rediriger immédiatement vers la page de connexion sans attendre 
    // que la déconnexion Firebase soit terminée
    window.location.href = '/';
  };

  // Fonction pour réinitialiser le mot de passe
  const handleResetPassword = async () => {
    if (!user.email) return;
    
    try {
      // Générer un mot de passe temporaire
      const tempPassword = generateTempPassword();
      
      // Trouver l'utilisateur dans Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.error('❌ Aucun utilisateur trouvé avec cet email dans Firestore');
        alert('Erreur: Utilisateur non trouvé dans la base de données');
        return;
      }
      
      // Mettre à jour l'utilisateur dans Firestore avec le nouveau mot de passe temporaire
      const userDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        tempPassword: tempPassword,
        passwordChanged: false
      });
      
      // Configuration personnalisée pour l'email de réinitialisation Firebase
      const resetActionCodeSettings = {
        // URL de redirection après la réinitialisation du mot de passe
        url: window.location.origin + `/login?email=${encodeURIComponent(user.email)}&reset=true`,
        // Activer la gestion du code dans l'application
        handleCodeInApp: true
      };
      
      // Envoyer l'email de réinitialisation Firebase
      await sendPasswordResetEmail(auth, user.email, resetActionCodeSettings);
      console.log('📧 Email de réinitialisation Firebase envoyé avec succès');
      
      // Ne pas déconnecter l'utilisateur automatiquement
      // onLogout();
    } catch (error) {
      console.error('❌ Erreur lors de la réinitialisation du mot de passe:', error);
      alert('Une erreur est survenue lors de la réinitialisation du mot de passe');
    }
  };
  
  const navigationItems = [
    {
      path: '/vehicles',
      label: 'Gestion des Véhicules',
      icon: <DirectionsCar />,
      requiredPermission: 'vehicles.view'
    }
  ];
  
  return (
    <div className="navbar-container">
      {/* Header avec logo et infos utilisateur */}
      <div className="app-header">
        <div className="logo-title-container">
          <img src={logoInovieWhite} alt="Inovie Logo" className="navbar-logo" />
          <span className="logo-text" style={{ textTransform: 'none' }}>inovie SCAN</span>
        </div>
        
        <div className="user-container" style={{ display: 'flex', alignItems: 'center' }}>
          {/* Intégration du sélecteur SELAS */}
          {userRole === 'Administrateur' && <SELASSelector />}
          
          <div className="user-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0033a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className="user-name">{getUserDisplayName()} <span className="user-role">({userRole})</span></span>
          </div>
          
          <div className="user-menu-container" ref={userMenuRef}>
            <button 
              className={`menu-button ${showUserMenu ? 'active' : ''}`}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              Menu
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            
            {showUserMenu && (
              <div className="user-dropdown-menu">
                <div 
                  className="dropdown-item" 
                  onClick={() => {
                    setShowUserMenu(false);
                    alert('La page de profil sera disponible prochainement');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0033a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Profil
                </div>
                <div 
                  className="dropdown-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    handleResetPassword();
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0033a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  Réinitialiser mot de passe
                </div>
                <div className="dropdown-divider"></div>
                <div 
                  className="dropdown-item logout"
                  onClick={handleLogout}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Déconnexion
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Barre de navigation */}
      <nav className="nav-menu">
        {pageAccess.dashboard && (
          <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Tableau de bord
          </Link>
        )}
        
        {pageAccess.passages && (
          <Link to="/passages" className={`nav-item ${location.pathname === '/passages' ? 'active' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            Passages
          </Link>
        )}
        
        {pageAccess.sites && (
          <Link to="/sites" className={`nav-item ${location.pathname === '/sites' ? 'active' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            Sites
          </Link>
        )}
        
        {pageAccess.tournees && (
          <Link to="/tournees" className={`nav-item ${location.pathname === '/tournees' ? 'active' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Tournées
          </Link>
        )}
        
        {pageAccess.vehicules && (
          <>
            <Link to="/vehicules" className={`nav-item ${location.pathname === '/vehicules' || location.pathname === '/vehicles' ? 'active' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2"></path>
                <circle cx="7" cy="17" r="2"></circle>
                <circle cx="17" cy="17" r="2"></circle>
              </svg>
              Gestion des Véhicules
            </Link>
          </>
        )}
        
        {pageAccess.map && (
          <Link to="/map" className={`nav-item ${location.pathname === '/map' ? 'active' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            Carte
          </Link>
        )}
        
        {pageAccess.userManagement && (
          <Link to="/admin/users" className={`nav-item ${location.pathname === '/admin/users' ? 'active' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Gestion des utilisateurs
          </Link>
        )}
        
        {userRole === 'Administrateur' && (
          <Link to="/admin" className={`nav-item ${location.pathname === '/admin' ? 'active' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            Administration
          </Link>
        )}
      </nav>
    </div>
  );
};

export default Navbar;
