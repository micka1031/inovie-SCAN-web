import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp, addDoc, doc, setDoc, deleteDoc, writeBatch, deleteField } from 'firebase/firestore';
import SharePointService from './SharePointService';
import JSZip from 'jszip';

/**
 * Service pour gérer les fonctionnalités d'administration
 */
export class AdminService {
  // Collections Firebase
  private collections = ['passages', 'sites', 'tournees', 'vehicules', 'users'];
  
  /**
   * Récupère les statistiques des collections
   * @returns Statistiques des collections
   */
  async getCollectionsStats(): Promise<Record<string, number>> {
    try {
      console.log('🔄 Récupération des statistiques des collections...');
      
      const stats: Record<string, number> = {};
      
      for (const collectionName of this.collections) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        stats[collectionName] = querySnapshot.size;
      }
      
      console.log('✅ Statistiques récupérées:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }
  
  /**
   * Crée une sauvegarde complète de la base de données
   * @returns Fichier ZIP contenant toutes les collections
   */
  async createFullBackup(): Promise<void> {
    try {
      console.log('🔄 Création d\'une sauvegarde complète...');
      
      // Utiliser le service SharePoint pour générer la sauvegarde
      await SharePointService.generateCompleteBackup();
      
      console.log('✅ Sauvegarde complète créée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la création de la sauvegarde complète:', error);
      throw error;
    }
  }
  
  /**
   * Crée une sauvegarde sélective de certaines collections
   * @param selectedCollections Collections à sauvegarder
   */
  async createSelectiveBackup(selectedCollections: string[]): Promise<void> {
    try {
      console.log(`🔄 Création d'une sauvegarde sélective pour les collections: ${selectedCollections.join(', ')}...`);
      
      // Vérifier que les collections sélectionnées sont valides
      const validCollections = selectedCollections.filter(col => this.collections.includes(col));
      
      if (validCollections.length === 0) {
        throw new Error('Aucune collection valide sélectionnée pour la sauvegarde');
      }
      
      // Créer un objet ZIP
      const zip = new JSZip();
      
      // Ajouter chaque collection sélectionnée au ZIP
      for (const collectionName of validCollections) {
        const data = await SharePointService.exportCollectionToJSON(collectionName);
        
        if (data && data.length > 0) {
          zip.file(`${collectionName}.json`, JSON.stringify(data, null, 2));
        }
      }
      
      // Générer le fichier ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Télécharger le fichier
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `selective_backup_${new Date().toISOString().split('T')[0]}.zip`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Sauvegarde sélective créée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la création de la sauvegarde sélective:', error);
      throw error;
    }
  }
  
  /**
   * Nettoie les données obsolètes d'une collection
   * @param collectionName Nom de la collection à nettoyer
   * @param olderThan Date limite (les documents plus anciens seront supprimés)
   * @returns Nombre de documents supprimés
   */
  async cleanupObsoleteData(collectionName: string, olderThan: Date): Promise<number> {
    try {
      console.log(`🔄 Nettoyage des données obsolètes de la collection ${collectionName}...`);
      
      // Vérifier que la collection est valide
      if (!this.collections.includes(collectionName)) {
        throw new Error(`La collection ${collectionName} n'est pas valide`);
      }
      
      // Convertir la date en Timestamp
      const olderThanTimestamp = Timestamp.fromDate(olderThan);
      
      // Récupérer les documents à supprimer
      const collectionRef = collection(db, collectionName);
      let queryRef;
      
      // Adapter la requête en fonction de la collection
      if (collectionName === 'passages') {
        queryRef = query(collectionRef, where('date', '<', olderThanTimestamp));
      } else if (collectionName === 'users') {
        queryRef = query(collectionRef, where('lastLogin', '<', olderThanTimestamp));
      } else {
        queryRef = query(collectionRef, where('updatedAt', '<', olderThanTimestamp));
      }
      
      const snapshot = await getDocs(queryRef);
      
      if (snapshot.empty) {
        console.log(`ℹ️ Aucune donnée obsolète trouvée dans la collection ${collectionName}`);
        return 0;
      }
      
      // Supprimer les documents
      const batch = writeBatch(db);
      let batchCount = 0;
      
      snapshot.docs.forEach(document => {
        batch.delete(doc(db, collectionName, document.id));
        batchCount++;
        
        // Exécuter le batch toutes les 500 opérations (limite Firestore)
        if (batchCount >= 500) {
          batch.commit();
          console.log(`✅ Lot de ${batchCount} documents supprimés`);
          batchCount = 0;
        }
      });
      
      // Exécuter le dernier batch s'il reste des opérations
      if (batchCount > 0) {
        await batch.commit();
        console.log(`✅ Dernier lot de ${batchCount} documents supprimés`);
      }
      
      console.log(`✅ Nettoyage terminé: ${snapshot.size} documents supprimés de la collection ${collectionName}`);
      return snapshot.size;
    } catch (error) {
      console.error(`❌ Erreur lors du nettoyage des données obsolètes:`, error);
      throw error;
    }
  }
  
  /**
   * Optimise les index de la base de données
   * Cette fonction est simulée car Firestore gère automatiquement ses index
   */
  async optimizeIndexes(): Promise<void> {
    try {
      console.log('🔄 Optimisation des index...');
      
      // Simuler une opération d'optimisation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ Optimisation des index terminée');
    } catch (error) {
      console.error('❌ Erreur lors de l\'optimisation des index:', error);
      throw error;
    }
  }
  
  /**
   * Réinitialise la base de données (DANGER)
   * @param confirmation Code de confirmation pour éviter les suppressions accidentelles
   */
  async resetDatabase(confirmation: string): Promise<void> {
    try {
      // Vérifier le code de confirmation
      if (confirmation !== 'RESET_DATABASE_CONFIRM') {
        throw new Error('Code de confirmation invalide');
      }
      
      console.log('⚠️ RÉINITIALISATION DE LA BASE DE DONNÉES EN COURS...');
      
      // Sauvegarder d'abord les données
      await this.createFullBackup();
      
      // Supprimer toutes les collections
      for (const collectionName of this.collections) {
        if (collectionName === 'users') {
          console.log('ℹ️ La collection users ne sera pas supprimée pour préserver les accès');
          continue;
        }
        
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        if (snapshot.empty) {
          console.log(`ℹ️ La collection ${collectionName} est déjà vide`);
          continue;
        }
        
        const batch = writeBatch(db);
        let batchCount = 0;
        
        snapshot.docs.forEach(document => {
          batch.delete(doc(db, collectionName, document.id));
          batchCount++;
          
          // Exécuter le batch toutes les 500 opérations (limite Firestore)
          if (batchCount >= 500) {
            batch.commit();
            console.log(`✅ Lot de ${batchCount} documents supprimés de ${collectionName}`);
            batchCount = 0;
          }
        });
        
        // Exécuter le dernier batch s'il reste des opérations
        if (batchCount > 0) {
          await batch.commit();
          console.log(`✅ Dernier lot de ${batchCount} documents supprimés de ${collectionName}`);
        }
        
        console.log(`✅ Collection ${collectionName} réinitialisée`);
      }
      
      console.log('✅ Réinitialisation de la base de données terminée');
    } catch (error) {
      console.error('❌ Erreur lors de la réinitialisation de la base de données:', error);
      throw error;
    }
  }
  
  /**
   * Récupère les journaux d'erreurs
   * Cette fonction est simulée car nous n'avons pas de système de journalisation
   */
  async getErrorLogs(): Promise<any[]> {
    try {
      console.log('🔄 Récupération des journaux d\'erreurs...');
      
      // Simuler des journaux d'erreurs
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Application démarrée',
          source: 'App.tsx'
        },
        {
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          level: 'WARNING',
          message: 'Tentative de connexion échouée',
          source: 'AuthContext.tsx'
        },
        {
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          level: 'ERROR',
          message: 'Erreur lors de la récupération des données',
          source: 'FirebaseService.ts',
          stack: 'Error: Failed to fetch data\n    at FirebaseService.fetchData (/src/services/FirebaseService.ts:42:7)'
        }
      ];
      
      console.log('✅ Journaux d\'erreurs récupérés');
      return logs;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des journaux d\'erreurs:', error);
      throw error;
    }
  }
  
  /**
   * Exporte les journaux d'erreurs
   * Cette fonction est simulée car nous n'avons pas de système de journalisation
   */
  async exportErrorLogs(): Promise<void> {
    try {
      console.log('🔄 Exportation des journaux d\'erreurs...');
      
      // Récupérer les journaux
      const logs = await this.getErrorLogs();
      
      // Créer un fichier JSON
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `error_logs_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Exportation des journaux d\'erreurs terminée');
    } catch (error) {
      console.error('❌ Erreur lors de l\'exportation des journaux d\'erreurs:', error);
      throw error;
    }
  }
  
  /**
   * Exécute un diagnostic complet du système
   * Cette fonction est simulée
   */
  async runFullDiagnostic(): Promise<any> {
    try {
      console.log('🔄 Exécution d\'un diagnostic complet...');
      
      // Simuler un diagnostic
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const diagnostic = {
        timestamp: new Date().toISOString(),
        system: {
          status: 'online',
          uptime: '7 days, 3 hours, 42 minutes',
          memory: {
            used: '1.2 GB',
            total: '2 GB',
            percentage: 60
          },
          cpu: {
            usage: '23%',
            temperature: '45°C'
          }
        },
        database: {
          status: 'connected',
          latency: '42ms',
          collections: await this.getCollectionsStats(),
          lastBackup: 'Jamais'
        },
        storage: {
          used: '2.1 GB',
          total: '5 GB',
          percentage: 42
        },
        errors: {
          critical: 0,
          warning: 2,
          info: 5
        }
      };
      
      console.log('✅ Diagnostic complet terminé');
      return diagnostic;
    } catch (error) {
      console.error('❌ Erreur lors de l\'exécution du diagnostic complet:', error);
      throw error;
    }
  }
  
  /**
   * Met à jour les paramètres de l'application
   * Cette fonction est simulée
   */
  async updateAppSettings(settings: any): Promise<void> {
    try {
      console.log('🔄 Mise à jour des paramètres de l\'application...', settings);
      
      // Simuler une mise à jour des paramètres
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Paramètres de l\'application mis à jour');
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour des paramètres de l\'application:', error);
      throw error;
    }
  }
} 