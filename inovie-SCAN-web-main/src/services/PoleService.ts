import { collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import React, { useState, useEffect } from 'react';

export interface Pole {
  id: string;
  nom: string;
  description?: string;
  selasId?: string;
  dateCreation: string;
  dateModification: string;
}

/**
 * Service de gestion des pôles
 */
export class PoleService {
  private static instance: PoleService;
  private readonly collectionName = 'poles';
  private poles: Pole[] = [];
  private lastFetch: number = 0;
  private fetchPromise: Promise<Pole[]> | null = null;
  
  // Constructeur privé pour le pattern Singleton
  private constructor() {}
  
  // Méthode pour obtenir l'instance
  public static getInstance(): PoleService {
    if (!PoleService.instance) {
      PoleService.instance = new PoleService();
    }
    return PoleService.instance;
  }
  
  /**
   * Récupérer tous les pôles avec possibilité de mise en cache
   * @param forceRefresh Forcer le rafraîchissement des données
   * @param cacheTime Durée de validité du cache en millisecondes (par défaut 5 minutes)
   */
  public async getPoles(forceRefresh = false, cacheTime = 5 * 60 * 1000): Promise<Pole[]> {
    const now = Date.now();
    
    // Si une requête est déjà en cours, attendre son résultat
    if (this.fetchPromise) {
      return this.fetchPromise;
    }
    
    // Si les données sont en cache et encore valides, les retourner
    if (!forceRefresh && this.poles.length > 0 && now - this.lastFetch < cacheTime) {
      return this.poles;
    }
    
    // Sinon, faire une nouvelle requête
    this.fetchPromise = this.fetchPolesFromFirestore();
    
    try {
      this.poles = await this.fetchPromise;
      this.lastFetch = now;
      return this.poles;
    } catch (error) {
      console.error('Erreur lors de la récupération des pôles:', error);
      throw error;
    } finally {
      this.fetchPromise = null;
    }
  }
  
  /**
   * Récupérer tous les pôles depuis Firestore
   */
  private async fetchPolesFromFirestore(): Promise<Pole[]> {
    try {
      const polesRef = collection(db, this.collectionName);
      const snapshot = await getDocs(polesRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Pole));
    } catch (error) {
      console.error('Erreur lors de la récupération des pôles depuis Firestore:', error);
      throw error;
    }
  }
  
  /**
   * Récupérer un pôle par son ID
   */
  public async getPoleById(id: string): Promise<Pole | null> {
    try {
      // D'abord, chercher dans le cache
      if (this.poles.length > 0) {
        const cachedPole = this.poles.find(pole => pole.id === id);
        if (cachedPole) return cachedPole;
      }
      
      // Sinon, chercher dans Firestore
      const poleRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(poleRef);
      
      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data()
        } as Pole;
      }
      
      return null;
    } catch (error) {
      console.error(`Erreur lors de la récupération du pôle ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Récupérer un pôle par son nom
   */
  public async getPoleByName(name: string): Promise<Pole | null> {
    try {
      // D'abord, chercher dans le cache
      if (this.poles.length > 0) {
        const cachedPole = this.poles.find(pole => pole.nom === name);
        if (cachedPole) return cachedPole;
      }
      
      // Sinon, chercher dans Firestore
      const polesRef = collection(db, this.collectionName);
      const q = query(polesRef, where('nom', '==', name));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as Pole;
      }
      
      return null;
    } catch (error) {
      console.error(`Erreur lors de la recherche du pôle ${name}:`, error);
      throw error;
    }
  }
}

// Composant React Hook pour utiliser le service des pôles
export const usePoles = (forceRefresh = false) => {
  const [poles, setPoles] = useState<Pole[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPoles = async () => {
      try {
        setLoading(true);
        const poleService = PoleService.getInstance();
        const fetchedPoles = await poleService.getPoles(forceRefresh);
        setPoles(fetchedPoles);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchPoles();
  }, [forceRefresh]);

  return { poles, loading, error };
}; 
