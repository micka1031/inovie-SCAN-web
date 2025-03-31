import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, handleFirebaseError } from '../firebase';
import { Tournee, Site, SiteTournee } from '../types/tournees.types';

// Références de collections mémorisées pour réduire les recréations
const sitesCollectionRef = collection(db, 'sites');
const tourneesCollectionRef = collection(db, 'tournees');

/**
 * Convertir une date JavaScript en Timestamp Firestore
 */
const dateToTimestamp = (date: Date | number | string): Timestamp => {
  if (!date) return Timestamp.now();
  
  try {
    // Si c'est déjà un Timestamp, le retourner
    if (typeof date === 'object' && 'seconds' in date && 'nanoseconds' in date) {
      return date as unknown as Timestamp;
    }
    
    // Convertir une date en Timestamp
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('Date invalide, utilisation de la date actuelle:', date);
      return Timestamp.now();
    }
    
    return Timestamp.fromDate(dateObj);
  } catch (error) {
    console.error('Erreur lors de la conversion de la date:', error);
    return Timestamp.now();
  }
};

/**
 * Assurer que toutes les dates dans un objet tournée sont des Timestamps
 */
const prepareTourneeForFirestore = (tournee: Partial<Tournee>): Record<string, any> => {
  const result: Record<string, any> = { ...tournee };
  
  // Convertir les dates principales
  if (tournee.heureDebut) {
    result.heureDebut = dateToTimestamp(tournee.heureDebut);
  }
  
  if (tournee.heureFin) {
    result.heureFin = dateToTimestamp(tournee.heureFin);
  }
  
  if (tournee.createdAt) {
    result.createdAt = dateToTimestamp(tournee.createdAt);
  }
  
  // Convertir les dates dans les sites
  if (tournee.sites && Array.isArray(tournee.sites)) {
    result.sites = tournee.sites.map(site => ({
      ...site,
      heureArrivee: site.heureArrivee ? dateToTimestamp(site.heureArrivee) : null
    }));
  }
  
  return result;
};

export const tourneesService = {
  /**
   * Récupérer tous les sites disponibles
   */
  getSites: async (): Promise<Site[]> => {
    try {
      console.log('Chargement des sites...');
      const snapshot = await getDocs(sitesCollectionRef);
      
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
      
      const createdSites: Site[] = [];
      
      // Créer les sites en lot pour optimiser les performances
      const batch = [];
      for (const site of demoSites) {
        batch.push(addDoc(sitesCollectionRef, site).then(docRef => ({
          id: docRef.id,
          ...site
        })));
      }
      
      // Attendre que tous les sites soient créés
      const results = await Promise.all(batch);
      createdSites.push(...results);
      
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
    try {
      const q = query(sitesCollectionRef, where('pole', '==', poleId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site));
    } catch (error) {
      console.error(`Erreur lors de la récupération des sites pour le pôle ${poleId}:`, error);
      handleFirebaseError(error);
      return [];
    }
  },

  /**
   * Créer une nouvelle tournée
   */
  createTournee: async (tournee: Omit<Tournee, 'id'>): Promise<string> => {
    try {
      // Préparer les données avec les dates correctement formatées
      const tourneeData = {
        ...prepareTourneeForFirestore(tournee),
        createdAt: serverTimestamp(),
        createdBy: tournee.createdBy || null
      };
      
      const docRef = await addDoc(tourneesCollectionRef, tourneeData);
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
      const snapshot = await getDocs(tourneesCollectionRef);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Convertir les Timestamps en objets Date
        const tournee: any = {
          id: doc.id,
          ...data
        };
        
        // Convertir les dates principales
        if (data.heureDebut) {
          tournee.heureDebut = data.heureDebut.toDate();
        }
        
        if (data.heureFin) {
          tournee.heureFin = data.heureFin.toDate();
        }
        
        if (data.createdAt) {
          tournee.createdAt = data.createdAt.toDate();
        }
        
        // Convertir les dates dans les sites
        if (data.sites && Array.isArray(data.sites)) {
          tournee.sites = data.sites.map((site: any) => ({
            ...site,
            heureArrivee: site.heureArrivee ? site.heureArrivee.toDate() : new Date()
          }));
        }
        
        return tournee as Tournee;
      });
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
      
      const tourneeData = docSnap.data();
      
      // Convertir les Timestamps en objets Date
      const tournee: any = {
        id: docSnap.id,
        ...tourneeData
      };
      
      // Convertir les dates principales
      if (tourneeData.heureDebut) {
        tournee.heureDebut = tourneeData.heureDebut.toDate();
      }
      
      if (tourneeData.heureFin) {
        tournee.heureFin = tourneeData.heureFin.toDate();
      }
      
      if (tourneeData.createdAt) {
        tournee.createdAt = tourneeData.createdAt.toDate();
      }
      
      // Convertir les dates dans les sites
      if (tourneeData.sites && Array.isArray(tourneeData.sites)) {
        tournee.sites = tourneeData.sites.map((site: any) => ({
          ...site,
          heureArrivee: site.heureArrivee ? site.heureArrivee.toDate() : new Date()
        }));
      }
      
      return tournee as Tournee;
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
      
      // Préparer les données avec les dates correctement formatées
      const tourneeData = {
        ...prepareTourneeForFirestore(tournee),
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, tourneeData);
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