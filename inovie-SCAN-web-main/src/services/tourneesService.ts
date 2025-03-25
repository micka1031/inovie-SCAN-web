import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirebaseError } from '../firebase';
import { Tournee, Site, SiteTournee } from '../types/tournees.types';

export const tourneesService = {
  /**
   * Récupérer tous les sites disponibles
   */
  getSites: async (): Promise<Site[]> => {
    try {
      console.log('Chargement des sites...');
      const sitesRef = collection(db, 'sites');
      const snapshot = await getDocs(sitesRef);
      
      if (snapshot.empty) {
        console.log('Aucun site trouvé, ajout de sites de démonstration...');
        return tourneesService.initDemoSites();
      }
      
      // Vérifier que chaque site a toutes les propriétés requises
      const sites = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nom: data.nom || 'Site sans nom',
          adresse: data.adresse || 'Adresse non spécifiée',
          codePostal: data.codePostal || '',
          ville: data.ville || '',
          latitude: data.latitude || 0,
          longitude: data.longitude || 0
        } as Site;
      });
      
      console.log(`${sites.length} sites chargés`);
      return sites;
    } catch (error) {
      console.error('Erreur lors du chargement des sites:', error);
      handleFirebaseError(error);
      return [];
    }
  },
  
  /**
   * Initialiser des sites de démonstration si aucun n'existe
   */
  initDemoSites: async (): Promise<Site[]> => {
    try {
      const demoSites: Omit<Site, 'id'>[] = [
        {
          nom: 'Labo Central',
          adresse: '123 Avenue Principale',
          codePostal: '34000',
          ville: 'Montpellier',
          latitude: 43.6112422,
          longitude: 3.8767337
        },
        {
          nom: 'Clinique du Sud',
          adresse: '45 Rue de la Médecine',
          codePostal: '34070',
          ville: 'Montpellier',
          latitude: 43.5884488,
          longitude: 3.8795093
        },
        {
          nom: 'Hôpital Nord',
          adresse: '78 Boulevard Nord',
          codePostal: '34080',
          ville: 'Montpellier',
          latitude: 43.6400921,
          longitude: 3.8532784
        },
        {
          nom: 'Centre Médical Est',
          adresse: '12 Avenue Est',
          codePostal: '34130',
          ville: 'Mauguio',
          latitude: 43.6177,
          longitude: 4.0088
        },
        {
          nom: 'Polyclinique Ouest',
          adresse: '56 Route Ouest',
          codePostal: '34430',
          ville: 'Saint-Jean-de-Védas',
          latitude: 43.5687,
          longitude: 3.8324
        }
      ];
      
      const sitesRef = collection(db, 'sites');
      const createdSites: Site[] = [];
      
      for (const site of demoSites) {
        const docRef = await addDoc(sitesRef, site);
        createdSites.push({
          id: docRef.id,
          ...site
        });
      }
      
      console.log(`${createdSites.length} sites de démonstration créés`);
      return createdSites;
    } catch (error) {
      console.error('Erreur lors de la création des sites de démonstration:', error);
      handleFirebaseError(error);
      return [];
    }
  },

  // Récupérer les sites filtrés par pôle
  async getSitesByPole(poleId: string): Promise<Site[]> {
    const sitesRef = collection(db, 'Sites');
    const q = query(sitesRef, where('pole', '==', poleId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site));
  },

  /**
   * Créer une nouvelle tournée
   */
  createTournee: async (tournee: Omit<Tournee, 'id'>): Promise<string> => {
    try {
      const tourneeData = {
        ...tournee,
        createdAt: serverTimestamp(),
        createdBy: tournee.createdBy || null
      };
      
      const docRef = await addDoc(collection(db, 'tournees'), tourneeData);
      console.log('Tournée créée avec ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de la création de la tournée:', error);
      handleFirebaseError(error);
      throw error;
    }
  },
  
  /**
   * Récupérer toutes les tournées
   */
  getTournees: async (): Promise<Tournee[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'tournees'));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tournee[];
    } catch (error) {
      console.error('Erreur lors de la récupération des tournées:', error);
      handleFirebaseError(error);
      return [];
    }
  },
  
  /**
   * Récupérer une tournée par son ID
   */
  getTourneeById: async (id: string): Promise<Tournee> => {
    try {
      const docRef = doc(db, 'tournees', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`Tournée avec ID ${id} introuvable`);
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Tournee;
    } catch (error) {
      console.error(`Erreur lors de la récupération de la tournée ${id}:`, error);
      handleFirebaseError(error);
      throw error;
    }
  },
  
  /**
   * Mettre à jour une tournée
   */
  updateTournee: async (id: string, tournee: Partial<Tournee>): Promise<void> => {
    try {
      const docRef = doc(db, 'tournees', id);
      await updateDoc(docRef, {
        ...tournee,
        updatedAt: serverTimestamp()
      });
      console.log(`Tournée ${id} mise à jour`);
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la tournée ${id}:`, error);
      handleFirebaseError(error);
      throw error;
    }
  },
  
  /**
   * Supprimer une tournée
   */
  deleteTournee: async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, 'tournees', id);
      await deleteDoc(docRef);
      console.log(`Tournée ${id} supprimée`);
    } catch (error) {
      console.error(`Erreur lors de la suppression de la tournée ${id}:`, error);
      handleFirebaseError(error);
      throw error;
    }
  }
};