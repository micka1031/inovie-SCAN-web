import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User,
  onAuthStateChanged,
  getIdToken
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { auth, db, PRODUCTION_URL } from '../config/firebase';

export const authService = {
  // Créer un utilisateur avec profil Firestore
  async createUser(email: string, password: string, additionalData: any = {}) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Créer un document utilisateur dans Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        createdAt: new Date(),
        role: 'user',
        status: 'active',
        ...additionalData
      });

      console.log('✅ Utilisateur créé:', user.uid);
      return user;
    } catch (error: any) {
      console.error('❌ Erreur de création d\'utilisateur:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
  },

  // Nouvelle méthode de création d'utilisateur de test
  async createTestUser() {
    const testEmail = 'test-app@votredomaine.com';
    const testPassword = 'MotDePasse123!';

    try {
      // Vérifier si l'utilisateur existe déjà
      try {
        await signInWithEmailAndPassword(auth, testEmail, testPassword);
        console.log('✅ Utilisateur de test existe déjà');
        return null;
      } catch (signInError: any) {
        // Si la connexion échoue, créer l'utilisateur
        if (signInError.code === 'auth/user-not-found') {
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            testEmail, 
            testPassword
          );
          
          const user = userCredential.user;
          
          // Créer un document utilisateur dans Firestore
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            createdAt: new Date(),
            role: 'test',
            status: 'active',
            testUser: true
          });

          console.log('✅ Nouvel utilisateur de test créé:', user.uid);
          return user;
        }
        
        throw signInError;
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la création de l\'utilisateur de test:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
  },

  // Connexion utilisateur avec vérification Firestore
  async signIn(email: string, password: string) {
    try {
      // Connexion Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Récupérer les données utilisateur de Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        throw new Error('Profil utilisateur non trouvé');
      }

      const userData = userDocSnap.data();

      console.log('✅ Connexion réussie:', {
        uid: user.uid,
        email: user.email,
        role: userData.role
      });

      return { 
        user, 
        userData 
      };
    } catch (error: any) {
      console.error('❌ Erreur de connexion:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
  },

  // Réinitialisation de mot de passe
  async resetPassword(email: string) {
    try {
      // Utiliser les paramètres actionCodeSettings pour la redirection
      const resetActionCodeSettings = {
        // URL de redirection après la réinitialisation du mot de passe
        url: PRODUCTION_URL + `/login?email=${encodeURIComponent(email)}&reset=true`,
        // Activer la gestion du code dans l'application
        handleCodeInApp: true,
        // Domaine pour les liens dynamiques Firebase
        dynamicLinkDomain: 'inovie-suivi-colis.page.link',
        // Paramètres iOS (si applicable)
        iOS: {
            bundleId: 'com.inovie.suivicolis'
        },
        // Paramètres Android (si applicable)
        android: {
            packageName: 'com.inovie.suivicolis',
            installApp: true,
            minimumVersion: '12'
        }
      };
      
      await sendPasswordResetEmail(auth, email, resetActionCodeSettings);
      console.log('✉️ Email de réinitialisation envoyé avec URL de redirection:', resetActionCodeSettings.url);
      
      // Retourner l'URL pour faciliter les tests
      return resetActionCodeSettings.url;
    } catch (error: any) {
      console.error('❌ Erreur de réinitialisation:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  },

  // Méthode de débogage complète
  async debugSignIn(email?: string, password?: string) {
    const testEmail = email || 'test-app@votredomaine.com';
    const testPassword = password || 'MotDePasse123!';

    console.group('🔍 Débogage Authentification Firebase');
    console.log('📧 Email de test:', testEmail);

    try {
      // Vérification de l'état actuel de l'authentification
      const currentUser = auth.currentUser;
      console.log('🔐 Utilisateur actuellement connecté:', 
        currentUser ? `Oui (${currentUser.uid})` : 'Non'
      );

      // Tentative de création d'utilisateur s'il n'existe pas
      let user;
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          testEmail, 
          testPassword
        );
        
        user = userCredential.user;
        console.log('✅ Nouvel utilisateur créé:', user.uid);
        
        // Créer un document utilisateur dans Firestore
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          createdAt: new Date(),
          role: 'test',
          status: 'active',
          testUser: true
        });
      } catch (createError: any) {
        // Gérer le cas où l'utilisateur existe déjà
        if (createError.code === 'auth/email-already-in-use') {
          console.log('🔄 Utilisateur existant, tentative de connexion');
        } else {
          throw createError;
        }
      }

      // Connexion
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        testEmail, 
        testPassword
      );
      
      user = userCredential.user;
      
      // Récupérer le token d'ID
      const idToken = await getIdToken(user);
      console.log('🔑 Token d\'ID récupéré');

      // Récupérer les données utilisateur de Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      const userData = userDocSnap.exists() 
        ? userDocSnap.data() 
        : null;

      console.log('✅ Connexion réussie:', {
        uid: user.uid,
        email: user.email,
        userData
      });

      console.groupEnd();

      return { 
        user, 
        userData,
        idToken 
      };
    } catch (error: any) {
      console.error('❌ Erreur de débogage:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      console.groupEnd();
      throw error;
    }
  },

  // Observateur d'état d'authentification avec logs détaillés
  observeAuthState(callback: (user: User | null, userData?: any) => void) {
    console.log('🔍 Configuration de l\'observateur d\'état d\'authentification');
    
    return onAuthStateChanged(
      auth, 
      async (user) => {
        console.log('🔐 Changement d\'état d\'authentification:', user ? user.uid : 'Déconnecté');
        
        if (user) {
          try {
            // Récupérer les données utilisateur
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            const userData = userDocSnap.exists() 
              ? userDocSnap.data() 
              : null;

            console.log('👤 Données utilisateur:', userData);
            callback(user, userData);
          } catch (error) {
            console.error('❌ Erreur de récupération du profil:', error);
            callback(user);
          }
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('❌ Erreur de suivi d\'authentification:', error);
        callback(null);
      }
    );
  }
};

// Fonction utilitaire pour tester la création d'utilisateur
export async function testUserCreation() {
  try {
    await authService.createTestUser();
    console.log('🧪 Test de création d\'utilisateur terminé');
  } catch (error) {
    console.error('❌ Échec du test de création d\'utilisateur', error);
  }
}

// Fonction utilitaire de débogage global
export async function debugAuthentication() {
  try {
    console.group('🧪 Débogage Complet de l\'Authentification');
    
    // Vérifier l'état actuel de l'authentification
    console.log('🔍 Vérification de l\'état d\'authentification');
    const currentUser = auth.currentUser;
    console.log('🔐 Utilisateur actuel:', 
      currentUser ? `Connecté (${currentUser.uid})` : 'Non connecté'
    );

    // Tenter de créer ou de se connecter à un utilisateur de test
    await authService.debugSignIn();
    
    console.log('✅ Débogage d\'authentification terminé');
    console.groupEnd();
  } catch (error) {
    console.error('❌ Échec du débogage d\'authentification', error);
    console.groupEnd();
  }
} 
