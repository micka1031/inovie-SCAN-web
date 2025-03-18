import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword,
    setPersistence,
    browserSessionPersistence
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    getDoc,
    enableIndexedDbPersistence,
    connectFirestoreEmulator,
    initializeFirestore,
    CACHE_SIZE_UNLIMITED,
    setLogLevel
} from 'firebase/firestore';

// Configuration Firebase sécurisée
const firebaseConfig = {
    apiKey: "AIzaSyBWDncE18JG9yjPX4kxTbSB9wLPi2qcAOw",
    authDomain: "application-inovie-scan.firebaseapp.com",
    projectId: "application-inovie-scan",
    storageBucket: "application-inovie-scan.firebasestorage.app",
    messagingSenderId: "703727839643",
    appId: "1:703727839643:web:f58c9241fb0d05a813593e",
    measurementId: "G-ZQF14KV51G"
};

// Configuration des logs
setLogLevel('warn');

// URL de base pour les redirections (toujours utiliser l'URL de production)
const PRODUCTION_URL = 'https://application-inovie-scan.web.app';

// URL pour les liens dynamiques
const DYNAMIC_LINKS_URL = 'https://application-inovie-scan-links.web.app';

// Liste des domaines autorisés pour les redirections
const ALLOWED_DOMAINS = [
  'application-inovie-scan.web.app',
  'application-inovie-scan.firebaseapp.com',
  'application-inovie-scan-links.web.app',
  'application-inovie-scan-links.firebaseapp.com',
  'localhost',
  '127.0.0.1',
  '172.16.254.29'  // Ajout de l'adresse IP locale
];

// Configuration des liens de réinitialisation de mot de passe
const actionCodeSettings = {
    // URL de redirection après la réinitialisation du mot de passe
    url: PRODUCTION_URL + '/login?reset=true',
    // Activer la gestion du code dans l'application
    handleCodeInApp: true,
    // Domaines autorisés pour les redirections
    android: null,
    iOS: null,
    dynamicLinkDomain: null
};

// Fonction de gestion des erreurs Firebase améliorée
const handleFirebaseError = (error: any, context: string) => {
    console.group(`❌ Erreur Firebase détaillée (${context})`);
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.log('Statut réseau:', {
        online: navigator.onLine,
        connection: (navigator as any).connection ? {
            type: (navigator as any).connection.type,
            effectiveType: (navigator as any).connection.effectiveType
        } : 'Non disponible'
    });
    console.groupEnd();
};

// Fonction de reprise des opérations Firebase
const retryFirebaseOperation = async <T>(
    operation: () => Promise<T>, 
    maxRetries = 3, 
    baseDelay = 1000
): Promise<T> => {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            // Vérification explicite de la connexion réseau
            if (!navigator.onLine) {
                console.warn(`🌐 Mode hors-ligne détecté. Tentative ${retries + 1}`);
                await new Promise(resolve => {
                    const onlineHandler = () => {
                        window.removeEventListener('online', onlineHandler);
                        resolve(null);
                    };
                    window.addEventListener('online', onlineHandler);
                });
            }

            return await operation();
        } catch (error: any) {
            console.warn(`Tentative ${retries + 1} échouée`, {
                message: error.message,
                code: error.code
            });

            // Gestion spécifique des erreurs réseau
            if (
                error.code === 'unavailable' || 
                error.message.includes('offline') || 
                error.message.includes('network')
            ) {
                console.log('🔄 Tentative de récupération réseau');
                retries++;
                await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, retries)));
                continue;
            }

            throw error;
        }
    }
    throw new Error('Opération Firebase a échoué après plusieurs tentatives');
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Vérifier la validité de la configuration Firebase
console.log('Vérification de la configuration Firebase...');
try {
    // Vérifier que les valeurs de configuration ne sont pas vides
    const configValues = Object.values(firebaseConfig);
    const hasEmptyValues = configValues.some(value => !value);
    
    if (hasEmptyValues) {
        console.error('❌ Configuration Firebase invalide: certaines valeurs sont vides');
    } else {
        console.log('✅ Configuration Firebase valide');
    }
    
    // Afficher la configuration (sans les valeurs sensibles)
    console.log('Configuration Firebase:', {
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        // Ne pas afficher apiKey et appId pour des raisons de sécurité
    });
} catch (error) {
    console.error('❌ Erreur lors de la vérification de la configuration Firebase:', error);
}

// Configuration Firestore avancée
const firestoreSettings = {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    experimentalAutoDetectLongPolling: true
};

// Initialiser Firestore avec les paramètres avancés
const db = initializeFirestore(app, firestoreSettings);

// Get Firebase services
const auth = getAuth(app);

// NOTE: Les fonctions Cloud Firebase ont été supprimées
// Nous utilisons maintenant une solution côté client pour créer des utilisateurs
// sans déconnecter l'administrateur (voir src/services/userService.ts)

// Configuration de la persistance
try {
    // Persistance de l'authentification
    setPersistence(auth, browserSessionPersistence)
        .then(() => {
            console.log('Persistance de session configurée');
        })
        .catch((error) => {
            console.error('Erreur de configuration de la persistance:', error);
            // Continuer malgré l'erreur
        });

    // Persistance Firestore
    enableIndexedDbPersistence(db, { forceOwnership: false })
        .then(() => {
            console.log('✅ Persistance Firestore activée');
        })
        .catch((error) => {
            if (error.code === 'failed-precondition') {
                console.warn('⚠️ La persistance Firestore ne peut pas être activée car plusieurs onglets sont ouverts');
            } else if (error.code === 'unimplemented') {
                console.warn('⚠️ Le navigateur ne prend pas en charge la persistance Firestore');
            } else {
                console.error('❌ Erreur lors de l\'activation de la persistance Firestore:', error);
            }
            // Continuer malgré l'erreur
        });
} catch (error) {
    console.error('❌ Erreur lors de la configuration de la persistance', error);
}

// Mode développement : connexion à l'émulateur
if (import.meta.env.DEV) {
    // Désactivé pour éviter les problèmes de connexion
    console.log('🔧 Émulateur Firestore désactivé');
    /*
    try {
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log('🔧 Connexion à l\'émulateur Firestore');
    } catch (error) {
        console.warn('⚠️ Impossible de se connecter à l\'émulateur', error);
    }
    */
}

// Fonction de connexion utilisateur
const loginUser = async (email: string, password: string) => {
    try {
        const userCredential = await retryFirebaseOperation(() => 
            signInWithEmailAndPassword(auth, email, password)
        );
        
        console.log('✅ Connexion réussie', {
            uid: userCredential.user.uid,
            email: userCredential.user.email
        });

        return userCredential.user;
    } catch (error: any) {
        console.error('❌ Erreur de connexion détaillée', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });

        switch (error.code) {
            case 'auth/invalid-credential':
                console.warn('🚫 Identifiants incorrects. Vérifiez votre email et mot de passe.');
                break;
            case 'auth/user-not-found':
                console.warn('🔍 Utilisateur non trouvé.');
                break;
            case 'auth/wrong-password':
                console.warn('🔐 Mot de passe incorrect.');
                break;
            default:
                console.warn('❓ Erreur de connexion non identifiée.');
        }

        throw error;
    }
};

// Tentative de connexion automatique
const autoLogin = async () => {
    try {
        console.log('🔐 Tentative de connexion automatique');
        
        const defaultEmail = import.meta.env.VITE_DEFAULT_EMAIL;
        const defaultPassword = import.meta.env.VITE_DEFAULT_PASSWORD;

        if (!defaultEmail || !defaultPassword) {
            console.warn('❌ Identifiants de connexion automatique non configurés');
            throw new Error('Identifiants de connexion manquants');
        }
        
        const userCredential = await retryFirebaseOperation(() => 
            signInWithEmailAndPassword(auth, defaultEmail, defaultPassword)
        );
        
        console.log('✅ Connexion automatique réussie', {
            uid: userCredential.user.uid,
            email: userCredential.user.email
        });

        return userCredential.user;
    } catch (error: any) {
        console.error('❌ Échec de la connexion automatique', {
            code: error.code,
            message: error.message
        });
        
        // Tentative de récupération en cas d'échec
        debugAuthState();
        
        throw error;
    }
};

// Diagnostic de l'état d'authentification
const debugAuthState = () => {
    console.group('🔍 Diagnostic complet de l\'authentification');
    console.log('🔑 Configuration Firebase:', {
        apiKey: firebaseConfig.apiKey ? '✅ Présent' : '❌ Manquant',
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId
    });

    console.log('🌐 État du réseau:', {
        online: navigator.onLine,
        connection: (navigator as any).connection ? 
            `Type: ${(navigator as any).connection.type}, Effectif: ${(navigator as any).connection.effectiveType}` 
            : 'Informations non disponibles'
    });

    // Vérification explicite de l'état d'authentification
    const currentUser = auth.currentUser;
    console.log('👤 Utilisateur Firebase actuel:', {
        exists: !!currentUser,
        uid: currentUser?.uid,
        email: currentUser?.email
    });

    console.groupEnd();
};

// Diagnostic avancé Firebase
const advancedFirebaseDiagnostic = async () => {
    console.group('🔍 Diagnostic Avancé Firebase');
    
    try {
        // Vérification de l'état d'authentification
        const currentUser = auth.currentUser;
        console.log('👤 État de l\'utilisateur:', {
            authenticated: !!currentUser,
            uid: currentUser?.uid,
            email: currentUser?.email,
            emailVerified: currentUser?.emailVerified
        });

        // Vérification du token
        if (currentUser) {
            try {
                const token = await currentUser.getIdToken(true);
                console.log('🔑 Token Firebase:', {
                    tokenLength: token.length,
                    tokenValid: token.length > 0
                });
            } catch (tokenError) {
                console.error('❌ Erreur de récupération du token:', tokenError);
            }
        }

        // Test de connexion Firestore
        try {
            const testCollectionRef = collection(db, 'test_diagnostic');
            const querySnapshot = await getDocs(testCollectionRef);
            console.log('✅ Connexion Firestore réussie', {
                documentsCount: querySnapshot.size
            });
        } catch (firestoreError: any) {
            console.error('❌ Erreur de connexion Firestore:', {
                code: firestoreError.code,
                message: firestoreError.message,
                stack: firestoreError.stack
            });
        }

        // Informations réseau détaillées
        console.log('🌐 Informations réseau:', {
            online: navigator.onLine,
            connection: (navigator as any).connection ? {
                type: (navigator as any).connection.type,
                effectiveType: (navigator as any).connection.effectiveType,
                downlinkMax: (navigator as any).connection.downlinkMax
            } : 'Non disponible'
        });

    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    } finally {
        console.groupEnd();
    }
};

// Fonction pour vérifier la configuration des domaines
const verifyDomainConfiguration = () => {
    console.group('🔍 Vérification de la configuration des domaines');
    
    // Vérifier si nous sommes en production ou en développement
    const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1') && !import.meta.env.DEV;
    console.log('Environnement:', isProduction ? 'Production' : 'Développement');
    console.log('Domaine actuel:', window.location.hostname);
    
    // Vérifier si le domaine actuel est dans la liste des domaines autorisés
    const currentDomain = window.location.hostname;
    const isDomainAllowed = ALLOWED_DOMAINS.includes(currentDomain) || import.meta.env.DEV;
    console.log('Domaine dans la liste des autorisés:', isDomainAllowed ? '✅ Oui' : '❌ Non');
    
    // Vérifier la configuration des liens dynamiques
    console.log('URL de production configurée:', PRODUCTION_URL);
    console.log('Configuration des liens dynamiques:', {
        url: actionCodeSettings.url,
        handleCodeInApp: actionCodeSettings.handleCodeInApp,
        dynamicLinkDomain: actionCodeSettings.dynamicLinkDomain
    });
    
    // Afficher des recommandations si nécessaire
    if (!isDomainAllowed && isProduction) {
        console.warn('⚠️ Le domaine actuel n\'est pas dans la liste des domaines autorisés. Ajoutez-le à la liste ALLOWED_DOMAINS.');
    }
    
    console.groupEnd();
    
    return {
        isProduction,
        currentDomain,
        isDomainAllowed,
        productionUrl: PRODUCTION_URL,
        actionCodeSettings
    };
};

// Exécuter la vérification au démarrage
const domainConfig = verifyDomainConfiguration();

export { 
    app, 
    auth, 
    db,
    loginUser,
    autoLogin,
    debugAuthState,
    advancedFirebaseDiagnostic,
    retryFirebaseOperation,
    handleFirebaseError,
    actionCodeSettings,
    PRODUCTION_URL,
    DYNAMIC_LINKS_URL,
    ALLOWED_DOMAINS,
    verifyDomainConfiguration,
    domainConfig
};
