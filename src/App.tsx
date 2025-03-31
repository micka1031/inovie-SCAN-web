import React, { useEffect, Suspense, useState, useCallback } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SelasProvider } from './contexts/SelasContext';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import Passages from './components/Passages';
import Sites from './components/Sites';
import Tournees from './components/Tournees';
import Vehicules from './components/Vehicules';
import UserManagement from './components/UserManagement';
import InitPassages from './components/InitPassages';
import MapView from './components/MapView';
import SharePointSync from './components/SharePointSync';
import MarkerPreferences from './components/MarkerPreferences';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import AdminPanel from './components/AdminPanel';
import VehicleManagement from './pages/VehicleManagement';
import SitesTableAdvancedExample from './components/SitesTableAdvancedExample';
import './App.css';
import { SnackbarProvider } from 'notistack';
import LoadingScreen from './components/LoadingScreen';
import { RoleService, canAccessPage } from './services/RoleService';
import { PAGES } from './utils/pageAccessUtils';
import { Role } from './types/roles';
import { ListAlt, LocalShipping, DirectionsCar, LocationOn, People } from '@mui/icons-material';
import TourneeDetails from './components/TourneeDetails';
import TourneesManagement from './pages/TourneesManagement';

// Composant principal de l'application
const App: React.FC = () => {
  const { currentUser, loading, error, logout } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState(false);

  // Fonction pour charger les rôles
  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const roleService = RoleService.getInstance();
      const fetchedRoles = await roleService.getRoles();
      console.log('App - Rôles chargés depuis Firestore:', fetchedRoles);
      
      // Vérifier les accès pour le rôle de l'utilisateur courant si connecté
      if (currentUser?.role) {
        console.log('App - Utilisateur connecté avec le rôle:', currentUser.role);
        console.log('App - Accès aux pages:');
        Object.values(PAGES).forEach(page => {
          const hasAccess = canAccessPage(currentUser.role, page);
          console.log(`- ${page}: ${hasAccess ? 'OUI' : 'NON'}`);
        });
      }
      
      setRoles(fetchedRoles);
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error);
      setRolesError(true);
    } finally {
      setRolesLoading(false);
    }
  }, [currentUser]);

  // Charger les rôles dynamiquement
  useEffect(() => {
    fetchRoles();
    
    // Écouter les changements de rôles
    const roleService = RoleService.getInstance();
    const handleRoleChange = () => {
      console.log('App - Changement de rôles détecté, rechargement...');
      fetchRoles();
    };
    
    roleService.addRoleChangeListener(handleRoleChange);
    
    return () => {
      roleService.removeRoleChangeListener(handleRoleChange);
    };
  }, [fetchRoles]);

  if (loading || rolesLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="error-container" style={{ 
        padding: '20px', 
        margin: '20px', 
        backgroundColor: '#ffebee', 
        border: '1px solid #f44336',
        borderRadius: '4px',
        color: '#d32f2f'
      }}>
        <h2>Erreur d'authentification</h2>
        <p>{error}</p>
        <p>Veuillez rafraîchir la page ou contacter l'administrateur.</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            padding: '8px 16px',
            backgroundColor: '#d32f2f',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Rafraîchir la page
        </button>
      </div>
    );
  }

  const isAuthenticated = !!currentUser;
  const userRole = currentUser?.role || 'Utilisateur';

  const router = createAppRouter(isAuthenticated, userRole, currentUser, logout, roles);

  return (
    <AuthProvider>
      <SelasProvider>
        <SnackbarProvider maxSnack={3}>
          <RouterProvider 
            router={router} 
            future={{ v7_startTransition: true }}
          />
        </SnackbarProvider>
      </SelasProvider>
    </AuthProvider>
  );
};

// Composant pour afficher un spinner de chargement
const LoadingSpinner = () => {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Chargement de l'application...</p>
    </div>
  );
};

// Composant Layout pour les routes authentifiées
const AppLayout: React.FC<{ user: any, logout: () => Promise<void> }> = ({ user, logout }) => {
  const navigate = useNavigate();
  
  // Si l'utilisateur n'est pas défini, rediriger vers la page de connexion
  useEffect(() => {
    if (!user) {
      console.log("AppLayout: Utilisateur non défini, redirection...");
      navigate('/');
    }
  }, [user, navigate]);
  
  // Si pas d'utilisateur, ne pas rendre le contenu
  if (!user) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="app">
      <Navbar user={user} onLogout={logout} />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

// Configuration du routeur avec les drapeaux pour React Router v7
const createAppRouter = (isAuthenticated: boolean, userRole: string, currentUser: any, logout: () => Promise<void>, roles: Role[]) => {
  // Routes pour les utilisateurs authentifiés
  const authenticatedRoutes = [
    {
      path: '/',
      element: <AppLayout user={currentUser} logout={logout} />,
      children: [
        {
          path: '',
          element: (
            <ProtectedRoute 
              userRole={userRole} 
              allowedRoles={['Administrateur', 'Utilisateur', 'default']}
              requiredPermissions={['dashboard.view']}
              pageName={PAGES.DASHBOARD}
              roles={roles}
            >
              <Dashboard />
            </ProtectedRoute>
          )
        },
        {
          path: 'passages',
          element: (
            <ProtectedRoute 
              userRole={userRole} 
              allowedRoles={['Administrateur', 'Utilisateur', 'Coursier', 'default']}
              requiredPermissions={['passages.view']}
              pageName={PAGES.PASSAGES}
              roles={roles}
            >
              <Passages />
            </ProtectedRoute>
          )
        },
        {
          path: 'passages/:id',
          element: (
            <ProtectedRoute 
              userRole={userRole} 
              allowedRoles={['Administrateur', 'Utilisateur', 'Coursier', 'default']}
              requiredPermissions={['passages.view']}
              pageName={PAGES.PASSAGE_DETAILS}
              roles={roles}
            >
              <Passages />
            </ProtectedRoute>
          )
        },
        {
          path: 'sites',
          element: (
            <ProtectedRoute 
              userRole={userRole} 
              allowedRoles={['Administrateur', 'Utilisateur', 'default']}
              requiredPermissions={['sites.view']}
              pageName={PAGES.SITES}
              roles={roles}
            >
              <Sites />
            </ProtectedRoute>
          )
        },
        {
          path: 'tournees',
          element: (
            <ProtectedRoute 
              userRole={userRole} 
              allowedRoles={['Administrateur', 'Utilisateur', 'default']}
              requiredPermissions={['tournees.view']}
              pageName={PAGES.TOURNEES}
              roles={roles}
            >
              <Tournees />
            </ProtectedRoute>
          )
        },
        {
          path: 'tournees/new',
          element: (
            <ProtectedRoute 
              userRole={userRole} 
              allowedRoles={['Administrateur', 'Utilisateur', 'default']}
              requiredPermissions={['tournees.edit']}
              pageName={PAGES.TOURNEES}
              roles={roles}
            >
              <TourneesManagement />
            </ProtectedRoute>
          )
        },
        {
          path: 'tournees/:id',
          element: (
            <ProtectedRoute 
              userRole={userRole} 
              allowedRoles={['Administrateur', 'Utilisateur', 'Coursier', 'default']}
              requiredPermissions={['tournees.view']}
              pageName={PAGES.TOURNEE_DETAILS}
              roles={roles}
            >
              <TourneeDetails />
            </ProtectedRoute>
          )
        },
        {
          path: 'vehicules',
          element: (
            <ProtectedRoute 
              userRole={userRole} 
              allowedRoles={['Administrateur', 'Utilisateur', 'default']}
              requiredPermissions={['vehicules.view']}
              pageName={PAGES.VEHICULES}
              roles={roles}
            >
              <VehicleManagement />
            </ProtectedRoute>
          )
        },
        {
          path: 'vehicles',
          element: (
            <ProtectedRoute 
              userRole={userRole} 
              allowedRoles={['Administrateur', 'Utilisateur', 'default']}
              requiredPermissions={['vehicules.view']}
              pageName={PAGES.VEHICULES}
              roles={roles}
            >
              <VehicleManagement />
            </ProtectedRoute>
          )
        },
        {
          path: 'admin/users',
          element: (
            <ProtectedRoute 
              userRole={userRole} 
              allowedRoles={['Administrateur', 'Utilisateur', 'Coursier', 'Manager', 'default']}
              requiredPermissions={['users.view']}
              pageName={PAGES.USER_MANAGEMENT}
              roles={roles}
            >
              <UserManagement />
            </ProtectedRoute>
          )
        },
        {
          path: 'admin',
          element: (
            <ProtectedRoute 
              userRole={userRole} 
              allowedRoles={['Administrateur']}
              requiredPermissions={['dashboard.view']}
              pageName={PAGES.ADMINISTRATION}
              roles={roles}
            >
              <AdminPanel />
            </ProtectedRoute>
          )
        },
        {
          path: 'init-passages',
          element: (
            <ProtectedRoute 
              userRole={userRole} 
              allowedRoles={['Administrateur', 'Utilisateur']}
              requiredPermissions={['init-passages.view']}
              pageName={PAGES.PASSAGES}
              roles={roles}
            >
              <InitPassages />
            </ProtectedRoute>
          )
        },
        {
          path: 'map',
          element: (
            <ProtectedRoute 
              userRole={userRole} 
              allowedRoles={['Administrateur', 'Utilisateur']}
              requiredPermissions={['carte.view']}
              pageName={PAGES.CARTE}
              roles={roles}
            >
              <MapView />
            </ProtectedRoute>
          )
        },
        {
          path: 'marker-preferences',
          element: (
            <ProtectedRoute 
              userRole={userRole} 
              allowedRoles={['Administrateur']}
              requiredPermissions={['marqueurs.edit']}
              pageName={PAGES.ADMINISTRATION}
              roles={roles}
            >
              <Navigate to="/admin?tab=5" replace />
            </ProtectedRoute>
          )
        },
        {
          path: 'sites-advanced',
          element: (
            <ProtectedRoute 
              userRole={userRole} 
              allowedRoles={['Administrateur', 'Utilisateur', 'default']}
              requiredPermissions={['sites.view']}
              pageName={PAGES.SITES}
              roles={roles}
            >
              <Navigate to="/sites" replace />
            </ProtectedRoute>
          )
        },
        {
          path: '*',
          element: userRole === 'Coursier' ? 
            <Navigate to="/passages" replace /> : 
            <Navigate to="/" replace />
        }
      ]
    }
  ];

  // Routes pour les utilisateurs non authentifiés
  const unauthenticatedRoutes = [
    {
      path: '/',
      element: <LoginScreen />
    },
    {
      path: '/login',
      element: <LoginScreen />
    },
    {
      path: '/reset-password',
      element: <LoginScreen />
    },
    {
      path: '*',
      element: <Navigate to="/" replace />
    }
  ];

  return createBrowserRouter(
    isAuthenticated ? authenticatedRoutes : unauthenticatedRoutes
  );
};

export default App;
