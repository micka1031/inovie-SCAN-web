import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  DocumentData,
  Query
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { auth, db } from '../firebase';

export class CollectionService {
  private userData: DocumentData | null = null;
  private userCollections: DocumentData[] = [];
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Écouter les changements d'authentification avec des logs détaillés
    auth.onAuthStateChanged(async (user) => {
      console.log('🔍 État de l\'authentification changé:', user ? user.uid : 'Aucun utilisateur');
      
      if (user) {
        try {
          await this.initializeUserCollections(user);
        } catch (error) {
          console.error('❌ Échec de l\'initialisation des collections:', error);
        }
      } else {
        this.resetCollections();
      }
    });
  }

  // Initialiser les collections de l'utilisateur
  async initializeUserCollections(user: User | null): Promise<void> {
    console.log('🚀 Tentative d\'initialisation des collections');
    
    // Vérification stricte de l'authentification
    if (!user || !auth.currentUser) {
      console.warn('⚠️ Impossible d\'initialiser les collections : utilisateur non authentifié');
      this.resetCollections();
      throw new Error('Utilisateur non authentifié');
    }

    // Éviter les initialisations multiples
    if (this.initializationPromise) {
      console.log('⏳ Initialisation déjà en cours');
      return this.initializationPromise;
    }

    this.initializationPromise = this.performCollectionInitialization(user);

    try {
      await this.initializationPromise;
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des collections:', error);
      this.resetCollections();
    } finally {
      this.initializationPromise = null;
    }
  }

  // Méthode privée pour l'initialisation des collections
  private async performCollectionInitialization(user: User): Promise<void> {
    console.log(`🔐 Initialisation des collections pour l'utilisateur: ${user.uid}`);

    try {
      // Vérification redondante de l'authentification
      if (!auth.currentUser) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer les données utilisateur
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        console.warn(`⚠️ Aucun profil trouvé pour l'utilisateur: ${user.uid}`);
        throw new Error('Profil utilisateur non trouvé');
      }

      this.userData = userDocSnap.data();
      console.log('👤 Données utilisateur récupérées');

      // Récupération des collections
      const collectionsRef = collection(db, 'collections');
      const userCollectionsQuery = query(
        collectionsRef, 
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(userCollectionsQuery);
      
      this.userCollections = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📦 ${this.userCollections.length} collections trouvées`);

      this.isInitialized = true;
      console.log('✅ Collections utilisateur initialisées avec succès');
    } catch (error) {
      console.error('❌ Échec de l\'initialisation des collections:', error);
      this.resetCollections();
      throw error;
    }
  }

  // Réinitialiser les collections
  private resetCollections() {
    this.userData = null;
    this.userCollections = [];
    this.isInitialized = false;
  }

  // Récupérer les données utilisateur
  getUserData(): DocumentData | null {
    return this.userData;
  }

  // Récupérer les collections de l'utilisateur
  getUserCollections(): DocumentData[] {
    if (!this.isInitialized) {
      console.warn('⚠️ Collections non initialisées');
      return [];
    }
    return this.userCollections;
  }

  // Vérifier si les collections sont prêtes
  isCollectionsReady(): boolean {
    return this.isInitialized;
  }

  // Attendre l'initialisation des collections
  async waitForInitialization(timeout = 10000): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkInitialization = () => {
        if (this.isInitialized) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          console.warn('⚠️ Délai d\'initialisation des collections dépassé');
          resolve(false);
        } else {
          setTimeout(checkInitialization, 500);
        }
      };

      checkInitialization();
    });
  }
}

// Créer une instance unique
export const collectionService = new CollectionService(); 