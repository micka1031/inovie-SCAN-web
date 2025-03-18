import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from '../types/User';

// Interface pour le contexte d'authentification
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isAllowedRoute: (route: string) => boolean;
  login: (email: string, password: string) => Promise<User>;
}

// Création du contexte avec une valeur par défaut
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  error: null,
  logout: async () => {},
  hasPermission: () => false,
  isAllowedRoute: () => false,
  login: async () => { throw new Error("Login function not implemented"); },
});

// Hook personnalisé pour utiliser le contexte d'authentification
export const useAuth = () => useContext(AuthContext);

// Définition des permissions par rôle
const rolePermissions: Record<string, string[]> = {
  Administrateur: [
    'dashboard.view',
    'passages.view', 'passages.create', 'passages.edit', 'passages.delete',
    'sites.view', 'sites.create', 'sites.edit', 'sites.delete',
    'tournees.view', 'tournees.create', 'tournees.edit', 'tournees.delete',
    'vehicules.view', 'vehicules.create', 'vehicules.edit', 'vehicules.delete',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'init-passages.view',
    'carte.view', 'carte.edit'
  ],
  Utilisateur: [
    'dashboard.view',
    'passages.view', 'passages.create', 'passages.edit',
    'sites.view', 'sites.create', 'sites.edit',
    'tournees.view', 'tournees.create', 'tournees.edit',
    'vehicules.view', 'vehicules.create', 'vehicules.edit',
    'users.view', 'users.create', 'users.edit',
    'init-passages.view',
    'carte.view'
  ],
  Coursier: [
    'passages.view', 'passages.create', 'passages.edit'
  ]
};

// Mapping des routes vers les permissions requises
const routePermissions: Record<string, string> = {
  '/': 'dashboard.view',
  '/passages': 'passages.view',
  '/sites': 'sites.view',
  '/tournees': 'tournees.view',
  '/vehicules': 'vehicules.view',
  '/admin/users': 'users.view',
  '/admin': 'dashboard.view', // L'admin panel nécessite des permissions spécifiques pour chaque onglet
  '/init-passages': 'init-passages.view',
  '/map': 'carte.view',
};

// Définition des routes autorisées par rôle
const allowedRoutes: Record<string, string[]> = {
  Administrateur: ['/', '/passages', '/sites', '/tournees', '/vehicules', '/admin/users', '/init-passages'],
  Utilisateur: ['/', '/passages', '/sites', '/tournees', '/vehicules', '/admin/users', '/init-passages'],
  Coursier: ['/passages']
};

// Fournisseur du contexte d'authentification
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour vérifier si l'utilisateur a une permission spécifique
  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    
    // Cas spécial pour Mickaël Volle (a toujours toutes les permissions)
    if (currentUser.email?.toLowerCase() === 'mickael.volle@inovie.fr') {
      return true;
    }
    
    const permissions = rolePermissions[currentUser.role] || [];
    return permissions.includes(permission);
  };

  // Fonction pour vérifier si l'utilisateur a accès à une route spécifique
  const isAllowedRoute = (route: string): boolean => {
    if (!currentUser) return false;
    
    // Cas spécial pour Mickaël Volle (a accès à toutes les routes)
    if (currentUser.email?.toLowerCase() === 'mickael.volle@inovie.fr') {
      return true;
    }
    
    // 1. Vérifier si l'utilisateur a la permission spécifique requise pour cette route
    const requiredPermission = routePermissions[route];
    if (requiredPermission && hasPermission(requiredPermission)) {
      return true;
    }
    
    // 2. Vérifier les routes autorisées comme fallback
    const routes = allowedRoutes[currentUser.role] || [];
    
    // Vérifier si la route exacte est autorisée
    if (routes.includes(route)) return true;
    
    // Vérifier si une route parente est autorisée (pour les sous-routes)
    return routes.some(allowedRoute => 
      route.startsWith(allowedRoute) && allowedRoute !== '/'
    );
  };

  // Fonction de déconnexion
  const logout = async (): Promise<void> => {
    try {
      // Mettre à jour l'état immédiatement pour une expérience utilisateur plus réactive
      setCurrentUser(null);
      
      // Déclencher la déconnexion Firebase en arrière-plan sans attendre
      signOut(auth).catch(error => {
        console.error('Erreur lors de la déconnexion Firebase:', error);
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      setError('Erreur lors de la déconnexion');
      
      // En cas d'erreur, continuer en forçant la déconnexion côté client
      setCurrentUser(null);
    }
  };

  // Fonction pour extraire le prénom et nom à partir de l'email
  const extractNameFromEmail = (email: string): string => {
    const parts = email.split('@')[0].split('.');
    if (parts.length > 1) {
      // Cas où l'email est prenom.nom@domaine.com
      return parts.map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ');
    }
    // Sinon, utiliser la partie avant @
    return parts[0].split('-').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
  };

  const login = async (email: string, password: string): Promise<User> => {
    try {
      setLoading(true);
      setError(null);

      // Connexion avec Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      console.log('🔍 Détails de l\'utilisateur Firebase:', {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName
      });

      // Rechercher l'utilisateur dans Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // MODIFICATION : Bloquer la création automatique
        console.error('❌ Aucun compte utilisateur trouvé. Veuillez contacter l\'administrateur.');
        throw new Error('Compte utilisateur non trouvé. Contactez votre administrateur.');
      }

      const firestoreData = userDoc.data();
      console.log('🔍 Données Firestore de l\'utilisateur:', firestoreData);

      const userData: User = {
        id: userDoc.id,
        identifiant: firestoreData.identifiant || email.split('@')[0],
        email: firestoreData.email || email,
        nom: firestoreData.nom || 
             firestoreData.displayName || 
             firebaseUser.displayName || 
             extractNameFromEmail(email),
        role: firestoreData.role || 'Utilisateur',
        pole: firestoreData.pole || '',
        statut: firestoreData.statut || 'actif',
        uid: firebaseUser.uid,
        permissions: firestoreData.permissions || [],
        dateCreation: firestoreData.dateCreation,
        dateModification: firestoreData.dateModification
      };

      console.log('🏷️ Nom d\'utilisateur final:', userData.nom);

      // Cas spécial pour Mickaël Volle
      if (email.toLowerCase() === 'mickael.volle@inovie.fr') {
        userData.role = 'Administrateur';
        userData.pole = 'Informatique';
        userData.permissions = rolePermissions['Administrateur'];
      }

      console.log('👤 Données utilisateur finales:', userData);
      setCurrentUser(userData);
      return userData;
    } catch (error: any) {
      console.error('Erreur lors de la connexion:', error);
      let errorMessage = 'Erreur lors de la connexion';
      
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Compte non trouvé ou identifiants incorrects';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives de connexion. Veuillez réessayer plus tard.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Effet pour gérer l'état d'authentification
  useEffect(() => {
    console.log("✅ Initialisation du gestionnaire d'authentification Firebase");
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔍 État de l\'authentification changé:', firebaseUser ? firebaseUser.email : 'Aucun utilisateur connecté');
      
      try {
        if (firebaseUser) {
          // Vérifier la connectivité réseau
          if (!navigator.onLine) {
            console.warn('⚠️ Mode hors ligne détecté. Utilisation des données en cache.');
            const cachedUser = localStorage.getItem('currentUser');
            if (cachedUser) {
              const parsedUser = JSON.parse(cachedUser);
              setCurrentUser(parsedUser);
              setLoading(false);
              return;
            }
          }

          // Configuration de la persistance réseau avec des tentatives de récupération
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          
          // Ajouter un timeout et des tentatives de récupération
          const fetchUserWithRetry = async (retries = 3) => {
            try {
              const userDoc = await getDoc(userDocRef);
              
              if (userDoc.exists()) {
                const userData = userDoc.data() as User;
                
                // Enrichir les données utilisateur si nécessaire
                const enrichedUserData: User = {
                  ...userData,
                  id: userDoc.id,
                  uid: firebaseUser.uid,
                  nom: userData.nom || 
                       firebaseUser.displayName || 
                       extractNameFromEmail(firebaseUser.email || '') || 
                       'Utilisateur',
                  email: userData.email || firebaseUser.email || '',
                  permissions: userData.permissions || [],
                  dateModification: new Date().toISOString()
                };

                console.log('👤 Données utilisateur récupérées:', enrichedUserData);
                
                // Sauvegarder en cache local
                localStorage.setItem('currentUser', JSON.stringify(enrichedUserData));
                
                setCurrentUser(enrichedUserData);
                setLoading(false);
              } else {
                console.warn('❌ Aucun document utilisateur trouvé pour l\'UID:', firebaseUser.uid);
                
                // Créer un document utilisateur par défaut
                const defaultUserData: User = {
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  identifiant: firebaseUser.email?.split('@')[0] || 'utilisateur',
                  email: firebaseUser.email || '',
                  nom: extractNameFromEmail(firebaseUser.email || '') || 'Utilisateur',
                  role: 'Utilisateur',
                  pole: '',
                  statut: 'actif',
                  permissions: [],
                  dateCreation: new Date().toISOString(),
                  dateModification: new Date().toISOString()
                };

                await setDoc(userDocRef, defaultUserData);
                setCurrentUser(defaultUserData);
                setLoading(false);
              }
            } catch (error) {
              console.error('❌ Erreur de récupération utilisateur:', error);
              
              if (retries > 0) {
                console.log(`🔄 Nouvelle tentative (${retries} restantes)...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Attente avant nouvelle tentative
                return fetchUserWithRetry(retries - 1);
              }
              
              // Gérer le cas où toutes les tentatives ont échoué
              const fallbackUser: User = {
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                identifiant: firebaseUser.email?.split('@')[0] || 'utilisateur',
                email: firebaseUser.email || '',
                nom: extractNameFromEmail(firebaseUser.email || '') || 'Utilisateur',
                role: 'Utilisateur',
                pole: '',
                statut: 'actif',
                permissions: [],
                dateCreation: new Date().toISOString(),
                dateModification: new Date().toISOString()
              };

              setCurrentUser(fallbackUser);
              setLoading(false);
            }
          };

          await fetchUserWithRetry();

        } else {
          // Aucun utilisateur connecté
          console.log('🚪 Aucun utilisateur connecté');
          setCurrentUser(null);
          localStorage.removeItem('currentUser');
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Erreur globale lors de la récupération utilisateur:', error);
        setCurrentUser(null);
        setLoading(false);
      }
    }, (error) => {
      console.error('❌ Erreur dans onAuthStateChanged:', error);
      setLoading(false);
    });

    // Nettoyer l'abonnement lors du démontage
    return () => unsubscribe();
  }, []);

  // Valeur du contexte
  const value: AuthContextType = {
    currentUser,
    loading,
    error,
    logout,
    hasPermission,
    isAllowedRoute,
    login
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 