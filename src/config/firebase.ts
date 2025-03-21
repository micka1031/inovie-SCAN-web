import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';

// Configuration Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Configuration des logs
setLogLevel('warn');

// URL de base pour les redirections
const PRODUCTION_URL = 'https://application-inovie-scan.web.app';

// Configuration des liens de réinitialisation de mot de passe
const actionCodeSettings = {
  url: `${PRODUCTION_URL}/login?reset=true`,
  handleCodeInApp: true,
  dynamicLinkDomain: null
};

// Liste des domaines autorisés
const ALLOWED_DOMAINS = [
  'application-inovie-scan.web.app',
  'application-inovie-scan.firebaseapp.com',
  'localhost',
  '127.0.0.1'
];

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize services
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Configuration de la persistance
try {
  // Persistance de l'authentification
  setPersistence(auth, browserSessionPersistence)
    .then(() => {
      console.log('Persistance de session configurée');
    })
    .catch((error) => {
      console.error('Erreur de configuration de la persistance:', error);
    });

  // Persistance Firestore
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log('✅ Persistance Firestore activée');
    })
    .catch((error) => {
      if (error.code === 'failed-precondition') {
        console.warn('⚠️ La persistance Firestore ne peut pas être activée car plusieurs onglets sont ouverts');
      } else if (error.code === 'unimplemented') {
        console.warn('⚠️ Le navigateur ne prend pas en charge la persistance Firestore');
      }
    });
} catch (error) {
  console.error('❌ Erreur lors de la configuration de la persistance', error);
}

// Fonction de gestion des erreurs Firebase
const handleFirebaseError = (error: any) => {
  console.error('Erreur Firebase:', error);
  return error;
};

// Export services and utilities
export { 
  db, 
  storage, 
  auth,
  PRODUCTION_URL,
  actionCodeSettings,
  ALLOWED_DOMAINS,
  handleFirebaseError
}; 
