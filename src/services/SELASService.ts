import { collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAuth } from 'firebase/auth';
import { SELAS, SELASCreation, SELASStats } from '../types/SELAS';

/**
 * Service de gestion des SELAS
 */
export class SELASService {
  private static instance: SELASService;
  private readonly collectionName = 'selas';
  
  // Constructeur privé pour le pattern Singleton
  private constructor() {}
  
  // Méthode pour obtenir l'instance
  public static getInstance(): SELASService {
    if (!SELASService.instance) {
      SELASService.instance = new SELASService();
    }
    return SELASService.instance;
  }
  
  /**
   * Récupérer toutes les SELAS
   */
  public async getSELAS(): Promise<SELAS[]> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.error('Erreur lors de la récupération des SELAS: Utilisateur non authentifié');
        throw new Error('Utilisateur non authentifié. Veuillez vous connecter pour accéder aux SELAS.');
      }
      
      console.log(`Tentative d'accès à la collection SELAS avec l'utilisateur: ${currentUser.email}`);
      
      const selasRef = collection(db, this.collectionName);
      const snapshot = await getDocs(selasRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SELAS));
    } catch (error) {
      console.error('Erreur lors de la récupération des SELAS:', error);
      throw error;
    }
  }
  
  /**
   * Récupérer une SELAS par son ID
   */
  public async getSELASById(id: string): Promise<SELAS | null> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.error(`Erreur lors de la récupération de la SELAS ${id}: Utilisateur non authentifié`);
        throw new Error('Utilisateur non authentifié. Veuillez vous connecter pour accéder aux SELAS.');
      }
      
      const selasRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(selasRef);
      
      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data()
        } as SELAS;
      }
      
      return null;
    } catch (error) {
      console.error(`Erreur lors de la récupération de la SELAS ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Ajouter une nouvelle SELAS
   */
  public async addSELAS(selas: Omit<SELAS, 'id' | 'dateCreation' | 'dateModification'>): Promise<SELAS> {
    try {
      const now = new Date().toISOString();
      const selasWithDates = {
        ...selas,
        dateCreation: now,
        dateModification: now
      };
      
      const selasRef = collection(db, this.collectionName);
      const docRef = await addDoc(selasRef, selasWithDates);
      
      return {
        id: docRef.id,
        ...selasWithDates
      } as SELAS;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la SELAS:', error);
      throw error;
    }
  }
  
  /**
   * Mettre à jour une SELAS existante
   */
  public async updateSELAS(id: string, updates: Partial<SELAS>): Promise<void> {
    try {
      const selasRef = doc(db, this.collectionName, id);
      
      const updatesWithDate = {
        ...updates,
        dateModification: new Date().toISOString()
      };
      
      await updateDoc(selasRef, updatesWithDate);
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la SELAS ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Supprimer une SELAS
   */
  public async deleteSELAS(id: string): Promise<void> {
    try {
      const selasRef = doc(db, this.collectionName, id);
      await deleteDoc(selasRef);
    } catch (error) {
      console.error(`Erreur lors de la suppression de la SELAS ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Récupérer les statistiques d'une SELAS
   */
  public async getSELASStats(selasId: string): Promise<SELASStats | null> {
    try {
      // Vérifier si la SELAS existe
      const selas = await this.getSELASById(selasId);
      if (!selas) return null;
      
      // Compter les utilisateurs, sites, passages, tournées et véhicules associés à cette SELAS
      const collections = ['users', 'sites', 'passages', 'tournees', 'vehicules'];
      const counts: Record<string, number> = {};
      
      for (const collectionName of collections) {
        const q = query(collection(db, collectionName), where('selasId', '==', selasId));
        const snapshot = await getDocs(q);
        counts[collectionName] = snapshot.size;
      }
      
      return {
        id: selasId,
        nom: selas.nom,
        nbUtilisateurs: counts['users'] || 0,
        nbSites: counts['sites'] || 0,
        nbPassages: counts['passages'] || 0,
        nbTournees: counts['tournees'] || 0,
        nbVehicules: counts['vehicules'] || 0
      };
    } catch (error) {
      console.error(`Erreur lors de la récupération des statistiques de la SELAS ${selasId}:`, error);
      throw error;
    }
  }

  /**
   * Exporte les données des SELAS sélectionnées
   * @param selasIds Liste des IDs de SELAS à exporter, si vide, exporte toutes les SELAS
   */
  public async exportSELAS(selasIds: string[] = []): Promise<any> {
    try {
      // Si aucun ID n'est spécifié, exporter toutes les SELAS
      let selasToExport: SELAS[] = [];
      
      if (selasIds.length === 0) {
        selasToExport = await this.getSELAS();
      } else {
        // Récupérer seulement les SELAS sélectionnées
        const selasPromises = selasIds.map(id => this.getSELASById(id));
        const selasResults = await Promise.all(selasPromises);
        selasToExport = selasResults.filter(sela => sela !== null) as SELAS[];
      }
      
      // Préparer les données d'exportation
      const exportData = {
        exportDate: new Date().toISOString(),
        selasCount: selasToExport.length,
        data: selasToExport.map(sela => ({
          ...sela,
          // Ne pas inclure d'informations sensibles si nécessaire
        }))
      };
      
      return exportData;
    } catch (error) {
      console.error('Erreur lors de l\'exportation des SELAS:', error);
      throw error;
    }
  }
} 
