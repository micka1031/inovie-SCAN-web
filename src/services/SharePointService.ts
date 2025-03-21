import { db } from '../config/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp, addDoc, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import JSZip from 'jszip';

/**
 * Service pour gérer l'intégration entre Firebase et SharePoint
 * Utilise une approche de synchronisation manuelle via fichiers CSV/JSON
 * pour contourner les limitations de double authentification
 */
export class SharePointService {
  // Collections Firebase à synchroniser
  private collections = ['passages', 'sites', 'tournees', 'vehicules'];
  
  /**
   * Exporte les données d'une collection Firebase au format CSV
   * @param collectionName Nom de la collection à exporter
   * @returns Chaîne de caractères au format CSV
   */
  async exportCollectionToCSV(collectionName: string): Promise<string> {
    try {
      console.log(`🔄 Exportation de la collection ${collectionName} au format CSV...`);
      
      // Récupérer les données de la collection
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      if (querySnapshot.empty) {
        console.log(`⚠️ La collection ${collectionName} est vide.`);
        return '';
      }
      
      // Extraire les données
      const documents = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Convertir les Timestamp en chaînes de caractères
        const formattedData: Record<string, any> = {};
        
        Object.entries(data).forEach(([key, value]) => {
          if (value instanceof Timestamp) {
            formattedData[key] = value.toDate().toISOString();
          } else {
            formattedData[key] = value;
          }
        });
        
        // Ajouter l'ID du document
        formattedData.id = doc.id;
        
        return formattedData;
      });
      
      // Obtenir toutes les clés uniques pour les en-têtes CSV
      const allKeys = new Set<string>();
      documents.forEach(doc => {
        Object.keys(doc).forEach(key => allKeys.add(key));
      });
      
      const headers = Array.from(allKeys);
      
      // Générer le CSV
      let csv = headers.join(',') + '\n';
      
      documents.forEach(doc => {
        const row = headers.map(header => {
          const value = doc[header];
          
          // Échapper les valeurs contenant des virgules ou des sauts de ligne
          if (value === undefined || value === null) {
            return '';
          } else if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          } else {
            return value;
          }
        });
        
        csv += row.join(',') + '\n';
      });
      
      console.log(`✅ Exportation de ${documents.length} documents de la collection ${collectionName} terminée.`);
      
      return csv;
    } catch (error) {
      console.error(`❌ Erreur lors de l'exportation de la collection ${collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Exporte les données d'une collection Firebase au format JSON
   * @param collectionName Nom de la collection à exporter
   * @returns Objet JSON contenant les données
   */
  async exportCollectionToJSON(collectionName: string): Promise<any[]> {
    try {
      console.log(`🔄 Exportation de la collection ${collectionName} au format JSON...`);
      
      // Récupérer les données de la collection
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      if (querySnapshot.empty) {
        console.log(`⚠️ La collection ${collectionName} est vide.`);
        return [];
      }
      
      // Extraire les données
      const documents = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Convertir les Timestamp en chaînes de caractères
        const formattedData: Record<string, any> = {};
        
        Object.entries(data).forEach(([key, value]) => {
          if (value instanceof Timestamp) {
            formattedData[key] = value.toDate().toISOString();
          } else {
            formattedData[key] = value;
          }
        });
        
        // Ajouter l'ID du document
        formattedData.id = doc.id;
        
        return formattedData;
      });
      
      console.log(`✅ Exportation de ${documents.length} documents de la collection ${collectionName} terminée.`);
      
      return documents;
    } catch (error) {
      console.error(`❌ Erreur lors de l'exportation de la collection ${collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Télécharge un fichier CSV contenant les données d'une collection
   * @param collectionName Nom de la collection à exporter
   */
  async downloadCollectionAsCSV(collectionName: string): Promise<void> {
    try {
      const csv = await this.exportCollectionToCSV(collectionName);
      
      if (!csv) {
        console.log(`⚠️ Aucune donnée à exporter pour la collection ${collectionName}.`);
        return;
      }
      
      // Créer un blob et un lien de téléchargement
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${collectionName}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(`❌ Erreur lors du téléchargement de la collection ${collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Télécharge un fichier JSON contenant les données d'une collection
   * @param collectionName Nom de la collection à exporter
   */
  async downloadCollectionAsJSON(collectionName: string): Promise<void> {
    try {
      const data = await this.exportCollectionToJSON(collectionName);
      
      if (!data || data.length === 0) {
        console.log(`⚠️ Aucune donnée à exporter pour la collection ${collectionName}.`);
        return;
      }
      
      // Créer un blob et un lien de téléchargement
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${collectionName}_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(`❌ Erreur lors du téléchargement de la collection ${collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Télécharge toutes les collections au format CSV
   */
  async downloadAllCollectionsAsCSV(): Promise<void> {
    try {
      console.log('🔄 Exportation de toutes les collections au format CSV...');
      
      for (const collectionName of this.collections) {
        await this.downloadCollectionAsCSV(collectionName);
      }
      
      console.log('✅ Exportation de toutes les collections terminée.');
    } catch (error) {
      console.error('❌ Erreur lors de l\'exportation de toutes les collections:', error);
      throw error;
    }
  }
  
  /**
   * Télécharge toutes les collections au format JSON
   */
  async downloadAllCollectionsAsJSON(): Promise<void> {
    try {
      console.log('🔄 Exportation de toutes les collections au format JSON...');
      
      for (const collectionName of this.collections) {
        await this.downloadCollectionAsJSON(collectionName);
      }
      
      console.log('✅ Exportation de toutes les collections terminée.');
    } catch (error) {
      console.error('❌ Erreur lors de l\'exportation de toutes les collections:', error);
      throw error;
    }
  }
  
  /**
   * Génère un fichier ZIP contenant toutes les collections au format JSON
   */
  async generateCompleteBackup(): Promise<void> {
    try {
      console.log("🔄 Génération d'une sauvegarde complète...");
      
      const zip = new JSZip();
      
      // Exporter chaque collection
      for (const collectionName of this.collections) {
        const data = await this.exportCollectionToJSON(collectionName);
        
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
      link.setAttribute('download', `firebase_backup_${new Date().toISOString().split('T')[0]}.zip`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Génération de la sauvegarde complète terminée.');
    } catch (error) {
      console.error('❌ Erreur lors de la génération de la sauvegarde complète:', error);
      throw error;
    }
  }
  
  /**
   * Importe des données au format CSV vers une collection Firebase
   * @param collectionName Nom de la collection cible
   * @param csvContent Contenu du fichier CSV
   * @param options Options d'importation
   * @returns Nombre de documents importés
   */
  async importCSVToCollection(
    collectionName: string, 
    csvContent: string,
    options: {
      clearCollection?: boolean;
      updateExisting?: boolean;
      idField?: string;
    } = {}
  ): Promise<number> {
    try {
      console.log(`🔄 Importation des données CSV vers la collection ${collectionName}...`);
      
      // Options par défaut
      const { 
        clearCollection = false, 
        updateExisting = true,
        idField = 'id'
      } = options;
      
      // Vérifier si la collection existe
      if (!this.collections.includes(collectionName)) {
        throw new Error(`La collection ${collectionName} n'est pas valide.`);
      }
      
      // Analyser le CSV
      const lines = csvContent.split('\n');
      if (lines.length < 2) {
        throw new Error('Le fichier CSV est vide ou ne contient que des en-têtes.');
      }
      
      // Extraire les en-têtes
      const headers = this.parseCSVLine(lines[0]);
      
      // Préparer les données
      const documents: Record<string, any>[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = this.parseCSVLine(line);
        if (values.length !== headers.length) {
          console.warn(`⚠️ Ligne ${i + 1} ignorée: nombre de valeurs incorrect`);
          continue;
        }
        
        const doc: Record<string, any> = {};
        
        for (let j = 0; j < headers.length; j++) {
          const header = headers[j];
          let value: any = values[j];
          
          // Convertir les valeurs en types appropriés
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
          else if (!isNaN(Number(value)) && value !== '') value = Number(value);
          else if (typeof value === 'string' && (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) || value.match(/^\d{4}-\d{2}-\d{2}/))) {
            // Convertir les dates ISO en Timestamp
            try {
              value = Timestamp.fromDate(new Date(value));
            } catch (e) {
              console.warn(`⚠️ Impossible de convertir la date: ${value}`);
            }
          }
          
          doc[header] = value;
        }
        
        documents.push(doc);
      }
      
      // Vider la collection si demandé
      if (clearCollection) {
        await this.clearCollection(collectionName);
      }
      
      // Importer les documents
      const totalDocuments = documents.length;
      let processedCount = 0;
      let importedCount = 0;
      
      while (processedCount < totalDocuments) {
        // Créer un nouveau lot pour chaque groupe de 500 documents
        const batch = writeBatch(db);
        const batchSize = Math.min(500, totalDocuments - processedCount);
        
        // Ajouter les documents au lot
        for (let i = 0; i < batchSize; i++) {
          const document = documents[processedCount + i];
          const docId = document[idField];
          
          if (docId && updateExisting) {
            // Mettre à jour ou créer le document avec l'ID spécifié
            const docRef = doc(db, collectionName, docId);
            batch.set(docRef, document);
          } else {
            // Créer un nouveau document avec un ID généré
            const collectionRef = collection(db, collectionName);
            const newDocRef = doc(collectionRef);
            batch.set(newDocRef, document);
          }
          
          importedCount++;
        }
        
        // Exécuter le lot
        await batch.commit();
        processedCount += batchSize;
        console.log(`✅ Lot de ${batchSize} documents importés (${processedCount}/${totalDocuments})`);
      }
      
      console.log(`✅ Importation terminée: ${importedCount} documents importés dans la collection ${collectionName}`);
      return importedCount;
    } catch (error) {
      console.error(`❌ Erreur lors de l'importation des données CSV:`, error);
      throw error;
    }
  }
  
  /**
   * Importe des données au format JSON vers une collection Firebase
   * @param collectionName Nom de la collection cible
   * @param jsonData Données JSON à importer
   * @param options Options d'importation
   * @returns Nombre de documents importés
   */
  async importJSONToCollection(
    collectionName: string, 
    jsonData: any[],
    options: {
      clearCollection?: boolean;
      updateExisting?: boolean;
      idField?: string;
    } = {}
  ): Promise<number> {
    try {
      console.log(`🔄 Importation des données JSON vers la collection ${collectionName}...`);
      
      // Options par défaut
      const { 
        clearCollection = false, 
        updateExisting = true,
        idField = 'id'
      } = options;
      
      // Vérifier si la collection existe
      if (!this.collections.includes(collectionName)) {
        throw new Error(`La collection ${collectionName} n'est pas valide.`);
      }
      
      // Vérifier que les données sont un tableau
      if (!Array.isArray(jsonData)) {
        throw new Error('Les données JSON doivent être un tableau d\'objets.');
      }
      
      // Convertir les dates en Timestamp
      const documents = jsonData.map(doc => {
        const processedDoc: Record<string, any> = {};
        
        Object.entries(doc).forEach(([key, value]) => {
          if (typeof value === 'string' && (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) || value.match(/^\d{4}-\d{2}-\d{2}/))) {
            // Convertir les dates ISO en Timestamp
            try {
              processedDoc[key] = Timestamp.fromDate(new Date(value));
            } catch (e) {
              console.warn(`⚠️ Impossible de convertir la date: ${value}`);
              processedDoc[key] = value;
            }
          } else {
            processedDoc[key] = value;
          }
        });
        
        return processedDoc;
      });
      
      // Vider la collection si demandé
      if (clearCollection) {
        await this.clearCollection(collectionName);
      }
      
      // Importer les documents
      const totalDocuments = documents.length;
      let processedCount = 0;
      let importedCount = 0;
      
      while (processedCount < totalDocuments) {
        // Créer un nouveau lot pour chaque groupe de 500 documents
        const batch = writeBatch(db);
        const batchSize = Math.min(500, totalDocuments - processedCount);
        
        // Ajouter les documents au lot
        for (let i = 0; i < batchSize; i++) {
          const document = documents[processedCount + i];
          const docId = document[idField];
          
          if (docId && updateExisting) {
            // Mettre à jour ou créer le document avec l'ID spécifié
            const docRef = doc(db, collectionName, docId);
            batch.set(docRef, document);
          } else {
            // Créer un nouveau document avec un ID généré
            const collectionRef = collection(db, collectionName);
            const newDocRef = doc(collectionRef);
            batch.set(newDocRef, document);
          }
          
          importedCount++;
        }
        
        // Exécuter le lot
        await batch.commit();
        processedCount += batchSize;
        console.log(`✅ Lot de ${batchSize} documents importés (${processedCount}/${totalDocuments})`);
      }
      
      console.log(`✅ Importation terminée: ${importedCount} documents importés dans la collection ${collectionName}`);
      return importedCount;
    } catch (error) {
      console.error(`❌ Erreur lors de l'importation des données JSON:`, error);
      throw error;
    }
  }
  
  /**
   * Importe des données depuis un fichier ZIP contenant plusieurs collections
   * @param zipContent Contenu du fichier ZIP
   * @param options Options d'importation
   * @returns Nombre de documents importés par collection
   */
  async importFromZip(
    zipContent: ArrayBuffer,
    options: {
      clearCollections?: boolean;
      updateExisting?: boolean;
      idField?: string;
    } = {}
  ): Promise<Record<string, number>> {
    try {
      console.log('🔄 Importation des données depuis le fichier ZIP...');
      
      const zip = new JSZip();
      await zip.loadAsync(zipContent);
      
      const results: Record<string, number> = {};
      
      // Parcourir les fichiers du ZIP
      for (const fileName in zip.files) {
        if (zip.files[fileName].dir) continue;
        
        const fileExt = fileName.split('.').pop()?.toLowerCase();
        const collectionName = fileName.split('.')[0];
        
        if (!this.collections.includes(collectionName)) {
          console.warn(`⚠️ Collection inconnue ignorée: ${collectionName}`);
          continue;
        }
        
        const fileContent = await zip.files[fileName].async('string');
        
        if (fileExt === 'json') {
          try {
            const jsonData = JSON.parse(fileContent);
            const count = await this.importJSONToCollection(collectionName, jsonData, options);
            results[collectionName] = count;
          } catch (e) {
            console.error(`❌ Erreur lors de l'importation du fichier JSON ${fileName}:`, e);
          }
        } else if (fileExt === 'csv') {
          try {
            const count = await this.importCSVToCollection(collectionName, fileContent, options);
            results[collectionName] = count;
          } catch (e) {
            console.error(`❌ Erreur lors de l'importation du fichier CSV ${fileName}:`, e);
          }
        } else {
          console.warn(`⚠️ Type de fichier non pris en charge: ${fileExt}`);
        }
      }
      
      console.log('✅ Importation depuis ZIP terminée:', results);
      return results;
    } catch (error) {
      console.error('❌ Erreur lors de l\'importation depuis le fichier ZIP:', error);
      throw error;
    }
  }
  
  /**
   * Vide une collection
   * @param collectionName Nom de la collection à vider
   */
  private async clearCollection(collectionName: string): Promise<void> {
    try {
      console.log(`🔄 Suppression des documents existants dans la collection ${collectionName}...`);
      
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      if (snapshot.empty) {
        console.log(`ℹ️ La collection ${collectionName} est déjà vide.`);
        return;
      }
      
      // Traiter les documents par lots de 500 (limite Firestore)
      const documents = snapshot.docs;
      const totalDocuments = documents.length;
      let processedCount = 0;
      
      while (processedCount < totalDocuments) {
        // Créer un nouveau lot pour chaque groupe de 500 documents
        const batch = writeBatch(db);
        const batchSize = Math.min(500, totalDocuments - processedCount);
        
        // Ajouter les suppressions au lot
        for (let i = 0; i < batchSize; i++) {
          const document = documents[processedCount + i];
          batch.delete(doc(db, collectionName, document.id));
        }
        
        // Exécuter le lot
        await batch.commit();
        processedCount += batchSize;
        console.log(`✅ Lot de ${batchSize} documents supprimés (${processedCount}/${totalDocuments})`);
      }
      
      console.log(`✅ Collection ${collectionName} vidée avec succès.`);
    } catch (error) {
      console.error(`❌ Erreur lors de la suppression des documents:`, error);
      throw error;
    }
  }
  
  /**
   * Analyse une ligne CSV en tenant compte des guillemets
   * @param line Ligne CSV à analyser
   * @returns Tableau des valeurs
   */
  private parseCSVLine(line: string): string[] {
    // Si la ligne est vide, retourner un tableau vide
    if (!line || line.trim() === '') {
      return [];
    }
    
    // Supprimer TOUS les caractères "ë" de la ligne avant tout traitement
    let cleanedLine = line.replace(/ë/g, '');
    cleanedLine = cleanedLine.replace(/Ë/g, '');
    
    // Détecter le séparateur le plus probable pour cette ligne
    let separator = ';'; // On définit le point-virgule comme séparateur par défaut
    const tabCount = (cleanedLine.match(/\t/g) || []).length;
    const semicolonCount = (cleanedLine.match(/;/g) || []).length;
    const commaCount = (cleanedLine.match(/,/g) || []).length;
    
    if (tabCount > 0 && tabCount >= semicolonCount && tabCount >= commaCount) {
      separator = '\t';
    } else if (commaCount > semicolonCount) {
      separator = ',';
    }
    
    // Diviser la ligne en utilisant le séparateur détecté
    const values = cleanedLine.split(separator).map(value => {
      // Nettoyer chaque valeur
      let cleanValue = value.trim();
      
      // Supprimer les guillemets en début et fin si présents
      if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
        cleanValue = cleanValue.slice(1, -1);
      }
      
      // Remplacer les doubles guillemets par des simples
      cleanValue = cleanValue.replace(/""/g, '"');
      
      return cleanValue;
    });
    
    // Afficher des informations de débogage
    console.log(`Ligne nettoyée: "${cleanedLine}"`);
    console.log(`Valeurs extraites: ${JSON.stringify(values)}`);
    
    return values;
  }
  
  /**
   * Normalise l'encodage des caractères spéciaux
   * @param text Texte à normaliser
   * @returns Texte normalisé
   */
  private normalizeEncoding(text: string): string {
    if (!text) return '';
    
    // Supprimer tous les caractères "ë" et "Ë"
    let result = text.replace(/[ëË]/g, '');
    
    // Remplacer les caractères mal encodés par leurs équivalents corrects
    const replacements: Record<string, string> = {
      'Ple': 'Pôle',
      'Pole': 'Pôle',
      'POLE': 'Pôle',
      'Tourne': 'Tournée',
      'TOURNEE': 'Tournée',
      'Tournee': 'Tournée',
      'Complment': 'Complément',
      'Complement': 'Complément',
      'Tlphone': 'Téléphone',
      'Telephone': 'Téléphone',
      'Coordonnes': 'Coordonnées',
      'Coordonnees': 'Coordonnées'
    };
    
    // Appliquer les remplacements
    Object.entries(replacements).forEach(([pattern, replacement]) => {
      result = result.replace(new RegExp(pattern, 'g'), replacement);
    });
    
    return result;
  }
  
  /**
   * Normalise l'encodage d'un fichier CSV/TXT entier
   * @param content Contenu du fichier
   * @returns Contenu normalisé
   */
  private normalizeFileEncoding(content: string): string {
    if (!content) return '';
    
    console.log('Normalisation de l\'encodage du fichier...');
    
    // Supprimer tous les caractères "ë"
    content = content.replace(/ë/g, '');
    
    // Détecter et corriger les problèmes d'encodage courants
    const lines = content.split(/\r?\n/);
    const normalizedLines = lines.map(line => {
      // Normaliser l'encodage de chaque ligne
      return this.normalizeEncoding(line);
    });
    
    return normalizedLines.join('\n');
  }
  
  /**
   * Détecte et corrige l'encodage d'un fichier CSV
   * @param content Contenu du fichier
   * @returns Contenu avec encodage corrigé
   */
  private detectAndFixEncoding(content: string): string {
    if (!content) return '';
    
    console.log('Détection et correction de l\'encodage...');
    
    // Vérifier si le contenu commence par un BOM UTF-8
    if (content.charCodeAt(0) === 0xFEFF) {
      console.log('BOM UTF-8 détecté, suppression...');
      content = content.slice(1);
    }
    
    // Supprimer tous les caractères "ë"
    if (content.includes('ë')) {
      console.log('Caractères "ë" détectés, suppression...');
      content = content.replace(/ë/g, '');
    }
    
    // Détecter les séquences typiques d'un encodage UTF-8 mal interprété
    const hasUtf8MisinterpretedSequences = 
      content.includes('Ã©') || // é
      content.includes('Ã¨') || // è
      content.includes('Ãª') || // ê
      content.includes('Ã ') || // à
      content.includes('Ã§') || // ç
      content.includes('Ã´') || // ô
      content.includes('Ã®') || // î
      content.includes('Ã¯') || // ï
      content.includes('Ã¼') || // ü
      content.includes('Ã¹') || // ù
      content.includes('Ã»') || // û
      content.includes('Ã¢') || // â
      content.includes('Ã«') || // ë
      content.includes('Ã‰') || // É
      content.includes('Ã"'); // Ô
    
    if (hasUtf8MisinterpretedSequences) {
      console.log('Séquences UTF-8 mal interprétées détectées, correction...');
      
      // Corriger les séquences UTF-8 mal interprétées
      content = content
        .replace(/Ã©/g, 'é')
        .replace(/Ã¨/g, 'è')
        .replace(/Ãª/g, 'ê')
        .replace(/Ã /g, 'à')
        .replace(/Ã§/g, 'ç')
        .replace(/Ã´/g, 'ô')
        .replace(/Ã®/g, 'î')
        .replace(/Ã¯/g, 'ï')
        .replace(/Ã¼/g, 'ü')
        .replace(/Ã¹/g, 'ù')
        .replace(/Ã»/g, 'û')
        .replace(/Ã¢/g, 'â')
        .replace(/Ã«/g, 'ë')
        .replace(/Ã‰/g, 'É')
        .replace(/Ã"/g, 'Ô')
        .replace(/PÃ´le/g, 'Pôle')
        .replace(/TournÃ©e/g, 'Tournée')
        .replace(/ComplÃ©ment d\'adresse/g, 'Complément d\'adresse')
        .replace(/TÃ©lÃ©phone/g, 'Téléphone')
        .replace(/CoordonnÃ©es/g, 'Coordonnées');
    }
    
    // Détecter les caractères mal encodés spécifiques
    const hasMissingAccents = 
      content.includes('Ple') || 
      content.includes('Tourne') || 
      content.includes('Complment');
    
    if (hasMissingAccents) {
      console.log('Caractères accentués manquants détectés, correction...');
      
      // Corriger les caractères mal encodés
      content = content
        .replace(/Ple/g, 'Pôle')
        .replace(/Tourne/g, 'Tournée')
        .replace(/Complment d\'adresse/g, 'Complément d\'adresse')
        .replace(/Complment/g, 'Complément')
        .replace(/Tlphone/g, 'Téléphone')
        .replace(/Coordonnes/g, 'Coordonnées');
    }
    
    return content;
  }
  
  /**
   * Importe des sites depuis un fichier TXT
   * @param txtContent Contenu du fichier TXT
   * @param options Options d'importation
   * @returns Nombre de documents importés
   */
  private async importSitesFromTXT(
    txtContent: string,
    options: {
      clearCollection?: boolean;
      updateExisting?: boolean;
      idField?: string;
    } = {}
  ): Promise<number> {
    try {
      console.log('Traitement spécifique pour fichier TXT...');
      
      // Détecter et corriger l'encodage du fichier
      let normalizedContent = this.detectAndFixEncoding(txtContent);
      
      // Normaliser l'encodage du contenu du fichier
      normalizedContent = this.normalizeFileEncoding(normalizedContent);
      
      // Diviser le contenu en lignes
      const lines = normalizedContent.split('\n').map(line => line.trim()).filter(line => line !== '');
      
      if (lines.length === 0) {
        throw new Error('Le fichier est vide.');
      }
      
      const firstLine = lines[0];
      
      if (!firstLine) {
        throw new Error('La première ligne du fichier est vide.');
      }
      
      console.log('Première ligne du fichier TXT:', firstLine);
      
      // Détecter le séparateur en comptant les occurrences
      const tabCount = (firstLine.match(/\t/g) || []).length;
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      
      console.log(`Séparateurs détectés - Tabulations: ${tabCount}, Points-virgules: ${semicolonCount}, Virgules: ${commaCount}`);
      
      // Afficher un échantillon des premières lignes pour le débogage
      console.log('Échantillon des 3 premières lignes TXT:');
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        console.log(`Ligne ${i}: ${lines[i]}`);
      }
      
      // Pour les fichiers TXT, on privilégie la tabulation si elle est présente
      let separator = '\t';
      
      if (tabCount > 0) {
        separator = '\t';
        console.log('Séparateur détecté pour TXT: tabulation');
      } else if (semicolonCount > 0 && semicolonCount >= commaCount) {
        separator = ';';
        console.log('Séparateur détecté pour TXT: point-virgule');
      } else if (commaCount > 0) {
        separator = ',';
        console.log('Séparateur détecté pour TXT: virgule');
      } else {
        console.log('Aucun séparateur standard détecté dans le fichier TXT, utilisation de la tabulation par défaut');
      }
      
      // Convertir le TXT en format CSV normalisé
      const normalizedCSV = lines.map(line => {
        if (!line) return '';
        
        // Remplacer le séparateur détecté par des virgules
        if (separator !== ',') {
          // Gérer correctement les champs entre guillemets avec le séparateur à l'intérieur
          const values = this.parseCSVLine(line);
          return values.map(value => {
            // Entourer de guillemets si la valeur contient une virgule
            if (value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',');
        }
        
        return line;
      }).join('\n');
      
      // Vérifier si la conversion a réussi
      const normalizedLines = normalizedCSV.split('\n');
      if (normalizedLines.length < 2) {
        throw new Error('La conversion du fichier TXT a échoué.');
      }
      
      // Extraire les en-têtes
      const headers = this.parseCSVLine(normalizedLines[0]);
      
      // Vérifier que le fichier contient suffisamment de colonnes
      if (headers.length < 3) {
        throw new Error(`Le fichier ne contient que ${headers.length} colonnes. Vérifiez le format du fichier et assurez-vous qu'il utilise des tabulations, des points-virgules ou des virgules comme séparateurs.`);
      }
      
      console.log('En-têtes détectés dans le fichier TXT:', headers);
      
      // Traiter les lignes avec la fonction commune
      return this.processImportLines(headers, normalizedLines, options);
    } catch (error) {
      console.error('❌ Erreur lors de l\'importation des sites depuis TXT:', error);
      throw error;
    }
  }
  
  /**
   * Affiche des informations de débogage sur un fichier CSV/TXT
   * @param content Contenu du fichier
   * @param fileName Nom du fichier
   */
  private debugFileInfo(content: string, fileName: string = 'inconnu'): void {
    console.group(`📊 Informations de débogage pour le fichier: ${fileName}`);
    
    try {
      // Informations générales
      console.log(`Taille du contenu: ${content.length} caractères`);
      console.log(`Type de fichier: ${fileName.endsWith('.txt') ? 'TXT' : 'CSV'}`);
      
      // Vérifier la présence du BOM UTF-8
      const hasBOM = content.charCodeAt(0) === 0xFEFF;
      console.log(`BOM UTF-8 détecté: ${hasBOM ? 'Oui' : 'Non'}`);
      
      // Analyser les lignes
      const lines = content.split('\n');
      console.log(`Nombre de lignes: ${lines.length}`);
      
      if (lines.length > 0) {
        // Analyser la première ligne (en-têtes)
        const firstLine = lines[0].trim();
        console.log(`Première ligne (${firstLine.length} caractères): ${firstLine.substring(0, 100)}${firstLine.length > 100 ? '...' : ''}`);
        
        // Détecter les séparateurs
        const tabCount = (firstLine.match(/\t/g) || []).length;
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        
        console.log(`Séparateurs détectés - Tabulations: ${tabCount}, Points-virgules: ${semicolonCount}, Virgules: ${commaCount}`);
        
        // Détecter le séparateur le plus probable
        let probableSeparator = ',';
        if (tabCount > 0 && tabCount >= semicolonCount && tabCount >= commaCount) {
          probableSeparator = '\t';
        } else if (semicolonCount > 0 && semicolonCount >= commaCount) {
          probableSeparator = ';';
        }
        
        console.log(`Séparateur le plus probable: ${probableSeparator === '\t' ? 'tabulation' : probableSeparator}`);
        
        // Estimer le nombre de colonnes
        const estimatedColumns = probableSeparator === '\t' 
          ? tabCount + 1 
          : (probableSeparator === ';' ? semicolonCount + 1 : commaCount + 1);
        
        console.log(`Nombre estimé de colonnes: ${estimatedColumns}`);
        
        // Vérifier la cohérence des lignes
        if (lines.length > 1) {
          const secondLine = lines[1].trim();
          const secondLineTabCount = (secondLine.match(/\t/g) || []).length;
          const secondLineSemicolonCount = (secondLine.match(/;/g) || []).length;
          const secondLineCommaCount = (secondLine.match(/,/g) || []).length;
          
          const secondLineColumns = probableSeparator === '\t' 
            ? secondLineTabCount + 1 
            : (probableSeparator === ';' ? secondLineSemicolonCount + 1 : secondLineCommaCount + 1);
          
          console.log(`Nombre de colonnes dans la deuxième ligne: ${secondLineColumns}`);
          console.log(`Cohérence des colonnes: ${estimatedColumns === secondLineColumns ? 'OK' : 'PROBLÈME'}`);
        }
        
        // Vérifier l'encodage des caractères spéciaux
        const specialChars = ['é', 'è', 'ê', 'à', 'ç', 'ô', 'î', 'ï', 'ü', 'ù', 'û', 'â', 'ë'];
        const specialCharsFound = specialChars.filter(char => content.includes(char));
        
        console.log(`Caractères spéciaux correctement encodés: ${specialCharsFound.length > 0 ? specialCharsFound.join(', ') : 'Aucun'}`);
        
        // Vérifier les séquences UTF-8 mal interprétées
        const badSequences = ['Ã©', 'Ã¨', 'Ãª', 'Ã ', 'Ã§', 'Ã´', 'Ã®', 'Ã¯', 'Ã¼', 'Ã¹', 'Ã»', 'Ã¢', 'Ã«'];
        const badSequencesFound = badSequences.filter(seq => content.includes(seq));
        
        console.log(`Séquences UTF-8 mal interprétées: ${badSequencesFound.length > 0 ? badSequencesFound.join(', ') : 'Aucune'}`);
        
        // Vérifier les caractères mal encodés spécifiques
        const specificBadChars = ['Ple', 'Tourne', 'Complment'];
        const specificBadCharsFound = specificBadChars.filter(char => content.includes(char));
        
        console.log(`Caractères mal encodés spécifiques: ${specificBadCharsFound.length > 0 ? specificBadCharsFound.join(', ') : 'Aucun'}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'analyse du fichier:', error);
    } finally {
      console.groupEnd();
    }
  }
  
  /**
   * Importe des sites depuis un fichier CSV
   * @param csvContent Contenu du fichier CSV
   * @param options Options d'importation
   * @returns Nombre de documents importés
   */
  async importSitesFromCSV(
    csvContent: string,
    options: {
      clearCollection?: boolean;
      updateExisting?: boolean;
      idField?: string;
      isTxtFile?: boolean;
      fileName?: string;
    } = {}
  ): Promise<number> {
    try {
      const { 
        clearCollection = false, 
        updateExisting = true,
        idField = 'id',
        isTxtFile = false,
        fileName = isTxtFile ? 'fichier.txt' : 'fichier.csv'
      } = options;
      
      console.log(`Début de l'importation des sites depuis ${isTxtFile ? 'TXT' : 'CSV'}...`);
      
      // Afficher des informations de débogage sur le fichier
      this.debugFileInfo(csvContent, fileName);
      
      // Traitement spécifique pour les fichiers TXT
      if (isTxtFile) {
        return this.importSitesFromTXT(csvContent, options);
      }
      
      // Supprimer tous les caractères "ë" du contenu
      let cleanedContent = csvContent.replace(/ë/g, '');
      console.log('Contenu après nettoyage des caractères ë (50 premiers caractères):', cleanedContent.substring(0, 50));
      
      // Détecter et corriger l'encodage du fichier
      let normalizedContent = this.detectAndFixEncoding(cleanedContent);
      
      // Vérifier si le contenu est encodé en UTF-8 avec BOM
      if (csvContent.charCodeAt(0) === 0xFEFF) {
        console.log('Détection du BOM UTF-8, suppression...');
        normalizedContent = csvContent.slice(1);
      }
      
      // Normaliser l'encodage du contenu du fichier
      normalizedContent = this.normalizeFileEncoding(normalizedContent);
      
      // Diviser le contenu en lignes
      const lines = normalizedContent.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
      
      if (lines.length === 0) {
        throw new Error('Le fichier est vide.');
      }
      
      const firstLine = lines[0];
      
      if (!firstLine) {
        throw new Error('La première ligne du fichier est vide.');
      }
      
      console.log('Première ligne du fichier:', firstLine);
      
      // Détecter le séparateur en comptant les occurrences
      const tabCount = (firstLine.match(/\t/g) || []).length;
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      
      // Initialiser la variable separator
      let separator = ',';
      
      // Détecter si c'est le format spécifique de l'utilisateur
      const isUserSpecificFormat = firstLine.includes('Pôle;Bassin;MI;Tournée') || 
                                  firstLine.includes('Pôle;Bassin;MI;Tournée;PT de rattachement') ||
                                  firstLine.includes('Pole;Bassin;MI;Tournee') ||
                                  firstLine.includes('ID;Pole;Bassin;MI;Tournee');
      
      if (isUserSpecificFormat) {
        console.log('Format spécifique détecté: format utilisateur avec séparateur point-virgule');
        separator = ';';
      }
      
      console.log(`Séparateurs détectés - Tabulations: ${tabCount}, Points-virgules: ${semicolonCount}, Virgules: ${commaCount}`);
      console.log(`Format détecté: ${isUserSpecificFormat ? 'Format utilisateur spécifique' : 'Format standard'}`);
      
      // Pour les fichiers TXT, on privilégie la tabulation si elle est présente
      if (isTxtFile) {
        if (tabCount > 0) {
          separator = '\t';
          console.log('Séparateur détecté pour TXT: tabulation');
        } else if (semicolonCount > 0 && semicolonCount >= commaCount) {
          separator = ';';
          console.log('Séparateur détecté pour TXT: point-virgule');
        } else if (commaCount > 0) {
          separator = ',';
          console.log('Séparateur détecté pour TXT: virgule');
        } else {
          console.log('Aucun séparateur standard détecté dans le fichier TXT, utilisation de la tabulation par défaut');
        }
      } else {
        // Pour les fichiers CSV, logique existante
        if (tabCount > 0 && tabCount >= semicolonCount && tabCount >= commaCount) {
          separator = '\t';
          console.log('Séparateur détecté pour CSV: tabulation');
        } else if (semicolonCount > 0 && semicolonCount >= commaCount) {
          separator = ';';
          console.log('Séparateur détecté pour CSV: point-virgule');
        } else {
          console.log('Séparateur détecté pour CSV: virgule');
        }
      }
      
      // Afficher un échantillon des premières lignes pour le débogage
      console.log('Échantillon des 3 premières lignes:');
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        console.log(`Ligne ${i}: ${lines[i]}`);
      }
      
      // Convertir le CSV en utilisant le séparateur détecté
      let normalizedCSV = '';
      
      if (separator !== ',') {
        normalizedCSV = lines.map(line => {
          if (!line) return '';
          
          // Gérer correctement les champs entre guillemets avec le séparateur à l'intérieur
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
              current += char;
            } else if (char === separator && !inQuotes) {
              result.push(current);
              current = '';
            } else {
              current += char;
            }
          }
          
          // Ajouter le dernier champ
          result.push(current);
          
          return result.join(',');
        }).join('\n');
      } else {
        normalizedCSV = normalizedContent;
      }
      
      // Vérifier si le fichier a été correctement normalisé
      const normalizedLines = normalizedCSV.split(/\r?\n/).filter(line => line.trim() !== '');
      if (normalizedLines.length < 2) {
        // Si la normalisation a échoué, essayer une approche différente
        console.warn('⚠️ La normalisation standard a échoué, tentative avec une approche alternative...');
        
        // Utiliser directement les lignes d'origine et laisser parseCSVLine gérer les séparateurs
        const alternativeLines = lines.filter(line => line.trim() !== '');
        
        if (alternativeLines.length < 2) {
          throw new Error('Le fichier est vide ou ne contient que des en-têtes.');
        }
        
        // Extraire les en-têtes avec la fonction parseCSVLine améliorée
        const headers = this.parseCSVLine(alternativeLines[0]);
        
        // Vérifier que le fichier contient suffisamment de colonnes
        if (headers.length < 3) {
          throw new Error(`Le fichier ne contient que ${headers.length} colonnes. Vérifiez le format du fichier et assurez-vous qu'il utilise des virgules, des points-virgules ou des tabulations comme séparateurs.`);
        }
        
        console.log('En-têtes détectés (approche alternative):', headers);
        
        // Continuer avec les lignes alternatives
        return this.processImportLines(headers, alternativeLines, options);
      }
      
      // Extraire les en-têtes
      const headers = this.parseCSVLine(normalizedLines[0]);
      
      // Vérifier que le CSV contient suffisamment de colonnes
      if (headers.length < 3) {
        throw new Error(`Le fichier ne contient que ${headers.length} colonnes. Vérifiez le format du fichier et assurez-vous qu'il utilise des virgules, des points-virgules ou des tabulations comme séparateurs.`);
      }
      
      console.log('En-têtes détectés:', headers);
      
      return this.processImportLines(headers, normalizedLines, options);
    } catch (error) {
      console.error(`❌ Erreur lors de l'importation des sites depuis ${isTxtFile ? 'TXT' : 'CSV'}:`, error);
      throw error;
    }
  }
  
  /**
   * Traite les lignes importées pour extraire les documents
   * @param headers En-têtes des colonnes
   * @param lines Lignes de données
   * @param options Options d'importation
   * @returns Nombre de documents importés
   */
  private async processImportLines(
    headers: string[],
    lines: string[],
    options: {
      clearCollection?: boolean;
      updateExisting?: boolean;
      idField?: string;
    } = {}
  ): Promise<number> {
    try {
      const { 
        clearCollection = false, 
        updateExisting = true,
        idField = 'id'
      } = options;

      // Récupérer tous les sites existants pour la vérification des doublons
      const sitesRef = collection(db, 'sites');
      const existingSites = await getDocs(sitesRef);
      const existingSitesMap = new Map<string, any>();
      const existingSitesByName = new Map<string, any>();
      const existingSitesByAddress = new Map<string, any>();

      existingSites.forEach(doc => {
        const siteData = doc.data();
        existingSitesMap.set(doc.id, siteData);
        
        // Index par nom normalisé
        if (siteData.nom) {
          const normalizedName = siteData.nom.toLowerCase().trim();
          existingSitesByName.set(normalizedName, { id: doc.id, ...siteData });
        }
        
        // Index par adresse complète normalisée
        if (siteData.adresse && siteData.ville && siteData.codePostal) {
          const normalizedAddress = `${siteData.adresse},${siteData.ville},${siteData.codePostal}`
            .toLowerCase()
            .replace(/\s+/g, '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          existingSitesByAddress.set(normalizedAddress, { id: doc.id, ...siteData });
        }
      });
      
      // Nettoyer les en-têtes avant de les normaliser
      const cleanedHeaders = headers.map(header => header.replace(/ë/g, ''));
      const normalizedHeaders = this.normalizeHeaders(cleanedHeaders);
      
      let importCount = 0;
      let skipCount = 0;
      let updateCount = 0;
      
      // Traiter les lignes par lots de 500
      const BATCH_SIZE = 500;
      const totalLines = lines.length - 1; // Exclure l'en-tête
      
      for (let startIndex = 1; startIndex < lines.length; startIndex += BATCH_SIZE) {
        // Créer un nouveau batch pour chaque groupe
        const batch = writeBatch(db);
        let batchCount = 0;
        
        const endIndex = Math.min(startIndex + BATCH_SIZE, lines.length);
        
        for (let i = startIndex; i < endIndex; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          
          const values = this.parseCSVLine(line);
          const document: Record<string, any> = {};
          
          // Construire le document à partir des valeurs
          normalizedHeaders.forEach((header, index) => {
            if (header && values[index]) {
              document[header] = this.normalizeValue(values[index].trim(), header);
            }
          });

          // Vérifier si le site existe déjà
          let existingSite = null;

          // 1. Vérifier par ID si disponible
          if (document.id) {
            existingSite = existingSitesMap.get(document.id);
          }

          // 2. Vérifier par nom normalisé
          if (!existingSite && document.nom) {
            const normalizedName = document.nom.toLowerCase().trim();
            existingSite = existingSitesByName.get(normalizedName);
          }

          // 3. Vérifier par adresse complète
          if (!existingSite && document.adresse && document.ville && document.codePostal) {
            const normalizedAddress = `${document.adresse},${document.ville},${document.codePostal}`
              .toLowerCase()
              .replace(/\s+/g, '')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '');
            existingSite = existingSitesByAddress.get(normalizedAddress);
          }

          // Si le site existe déjà
          if (existingSite) {
            if (!updateExisting) {
              skipCount++;
              continue;
            }

            // Vérifier si les données sont différentes avant de mettre à jour
            const hasChanges = Object.keys(document).some(key => 
              document[key] !== existingSite[key] && document[key] !== undefined
            );

            if (!hasChanges) {
              skipCount++;
              continue;
            }

            // Mettre à jour le site existant
            const siteRef = doc(db, 'sites', existingSite.id);
            batch.set(siteRef, document);
            updateCount++;
            batchCount++;
          } else {
            // Créer un nouveau site
            const newSiteRef = doc(collection(db, 'sites'));
            batch.set(newSiteRef, document);
            importCount++;
            batchCount++;
          }
        }

        // Commiter le batch s'il contient des opérations
        if (batchCount > 0) {
          await batch.commit();
          console.log(`Lot de ${batchCount} documents traité (${startIndex}/${totalLines})`);
        }
      }

      console.log(`
        Importation terminée:
        - ${importCount} nouveaux sites importés
        - ${updateCount} sites mis à jour
        - ${skipCount} sites ignorés (doublons ou sans changements)
      `);

      return importCount + updateCount;
    } catch (error) {
      console.error('Erreur lors du traitement des lignes:', error);
      throw error;
    }
  }
  
  /**
   * Normalise les en-têtes pour corriger les problèmes d'encodage
   * @param headers Tableau des en-têtes
   * @returns Tableau des en-têtes normalisés
   */
  private normalizeHeaders(headers: string[]): string[] {
    console.log('Normalisation des en-têtes...');
    console.log('En-têtes originaux:', headers);
    
    // Mapping complet des en-têtes
    const headerReplacements: Record<string, string> = {
      // Variations de Pôle
      'pole': 'pole',
      'pôle': 'pole',
      'pôles': 'pole',
      'poles': 'pole',
      'ple': 'pole',
      'p le': 'pole',
      'p.le': 'pole',
      'p?le': 'pole',
      
      // Variations de Type
      'type': 'type',
      'type de site': 'type',
      'type site': 'type',
      'categorie': 'type',
      'catégorie': 'type',
      
      // Variations de Nom
      'nom': 'nom',
      'nom site': 'nom',
      'site': 'nom',
      'nom du site': 'nom',
      'denomination': 'nom',
      'dénomination': 'nom',
      
      // Variations d'Adresse
      'adresse': 'adresse',
      'adresses': 'adresse',
      'adr': 'adresse',
      'adresse site': 'adresse',
      'adresse complete': 'adresse',
      'adresse complète': 'adresse',
      
      // Variations de Complément d'adresse
      'complement': 'complementAdresse',
      'complément': 'complementAdresse',
      'complement adresse': 'complementAdresse',
      'complément adresse': 'complementAdresse',
      'complement d\'adresse': 'complementAdresse',
      'complément d\'adresse': 'complementAdresse',
      
      // Variations de Ville
      'ville': 'ville',
      'commune': 'ville',
      'localite': 'ville',
      'localité': 'ville',
      'villes': 'ville',
      
      // Variations de Code postal
      'cp': 'codePostal',
      'code postal': 'codePostal',
      'code_postal': 'codePostal',
      'codepostal': 'codePostal',
      'cp site': 'codePostal',
      
      // Variations de Pays
      'pays': 'pays',
      'country': 'pays',
      'nation': 'pays',
      
      // Variations de Téléphone
      'tel': 'telephone',
      'tél': 'telephone',
      'telephone': 'telephone',
      'téléphone': 'telephone',
      'num tel': 'telephone',
      'numéro': 'telephone',
      
      // Variations d'Email
      'email': 'email',
      'e-mail': 'email',
      'mail': 'email',
      'courriel': 'email',
      'adresse mail': 'email',
      
      // Variations de Status
      'status': 'statut',
      'statut': 'statut',
      'etat': 'statut',
      'état': 'statut',
      
      // Variations de Tournée
      'tournee': 'tournees',
      'tournée': 'tournees',
      'tournees': 'tournees',
      'tournées': 'tournees',
      
      // Variations de MI
      'mi': 'mi',
      'responsable': 'mi',
      'responsable mi': 'mi',
      
      // Variations de Bassin
      'bassin': 'bassin',
      'zone': 'bassin',
      'secteur': 'bassin',
      
      // Autres champs
      'id': 'id',
      'identifiant': 'id',
      'reference': 'id',
      'référence': 'id',
      'horaires lv': 'horairesLV',
      'horaire lv': 'horairesLV',
      'horaires semaine': 'horairesLV',
      'horaires sam': 'horairesSamedi',
      'horaire sam': 'horairesSamedi',
      'horaires samedi': 'horairesSamedi'
    };
    
    // Nettoyer et normaliser les en-têtes
    const normalizedHeaders = headers.map(header => {
      // Nettoyage initial
      const cleanHeader = header
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
        .replace(/[^a-z0-9\s]/g, ' ') // Garder uniquement les lettres, chiffres et espaces
        .replace(/\s+/g, ' ') // Normaliser les espaces
        .trim();
      
      // Rechercher dans le mapping
      const mappedHeader = headerReplacements[cleanHeader];
      
      if (mappedHeader) {
        console.log(`En-tête normalisé: "${header}" -> "${mappedHeader}"`);
        return mappedHeader;
      }
      
      // Si pas trouvé dans le mapping, retourner la version nettoyée
      console.log(`En-tête non mappé: "${header}" -> "${cleanHeader}"`);
      return cleanHeader;
    });
    
    console.log('En-têtes finaux après normalisation:', normalizedHeaders);
    return normalizedHeaders;
  }
  
  /**
   * Normalise les valeurs des colonnes
   * @param value Valeur à normaliser
   * @param fieldName Nom du champ
   * @returns Valeur normalisée
   */
  private normalizeValue(value: string, fieldName: string): string {
    if (!value) return '';
    
    // Supprimer les caractères spéciaux et les espaces en trop
    let normalizedValue = value.trim()
      .replace(/[ëË]/g, '')
      .replace(/\s+/g, ' ');

    // Normalisation spécifique selon le type de champ
    switch (fieldName.toLowerCase()) {
      case 'pole':
        // Normaliser les variations de "Pôle"
        normalizedValue = normalizedValue
          .replace(/^p[oôó]le\s*/i, '')
          .replace(/^p\s*[oôó]le\s*/i, '')
          .trim();
        break;
      
      case 'type':
        // Normaliser les types de sites
        const lowerValue = normalizedValue.toLowerCase();
        if (lowerValue.includes('labo') || lowerValue.includes('lab')) {
          normalizedValue = 'Laboratoire';
        } else if (lowerValue.includes('site')) {
          normalizedValue = 'Site';
        } else if (lowerValue.includes('client')) {
          normalizedValue = 'Client';
        } else if (lowerValue.includes('point')) {
          normalizedValue = 'Point de collecte';
        } else {
          normalizedValue = normalizedValue.charAt(0).toUpperCase() + normalizedValue.slice(1).toLowerCase();
        }
        break;
      
      case 'ville':
      case 'nom':
        // Capitaliser chaque mot pour les villes et les noms
        normalizedValue = normalizedValue.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        break;
      
      case 'codepostal':
        // Nettoyer le code postal (garder uniquement les chiffres)
        normalizedValue = normalizedValue.replace(/\D/g, '');
        break;
      
      case 'telephone':
        // Normaliser les numéros de téléphone
        normalizedValue = normalizedValue.replace(/\D/g, '');
        if (normalizedValue.length === 10) {
          normalizedValue = normalizedValue.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1.$2.$3.$4.$5');
        }
        break;
      
      case 'email':
        // Mettre les emails en minuscules
        normalizedValue = normalizedValue.toLowerCase();
        break;
      
      case 'adresse':
        // Normaliser les adresses
        normalizedValue = normalizedValue
          .replace(/\s+/g, ' ')
          .replace(/,\s*/g, ', ')
          .replace(/\s*-\s*/g, '-')
          .trim();
        break;
    }
    
    return normalizedValue;
  }
  
  /**
   * Traite spécifiquement le format de données fourni par l'utilisateur
   * @param csvContent Contenu du fichier CSV
   * @param options Options d'importation
   * @returns Nombre de documents importés
   */
  async importUserSpecificFormat(
    csvContent: string,
    options: {
      clearCollection?: boolean;
      updateExisting?: boolean;
      idField?: string;
    } = {}
  ): Promise<number> {
    try {
      console.log('🔄 Importation avec le format spécifique de l\'utilisateur...');
      
      // Options par défaut
      const { 
        clearCollection = false, 
        updateExisting = true,
        idField = 'id'
      } = options;
      
      // Séparer les lignes
      const lines = csvContent.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        throw new Error('Le fichier est vide ou ne contient que des en-têtes.');
      }
      
      // Extraire et normaliser les en-têtes
      const headers = lines[0].split(';').map(header => header.trim());
      const normalizedHeaders = this.normalizeHeaders(headers);
      console.log('En-têtes normalisés:', normalizedHeaders);
      
      // Mapper les en-têtes aux champs de la base de données
      const fieldMap: Record<string, string> = {
        'pole': 'pole',
        'pôle': 'pole',
        'tournée': 'tournees',
        'type de site': 'type',
        'nom': 'nom',
        'adresse': 'adresse',
        'complément d\'adresse': 'complementAdresse',
        'ville': 'ville',
        'code postal': 'codePostal',
        'pays': 'pays',
        'horaire d\'ouverture - lundi - vendredi': 'horairesLV',
        'horaire d\'ouverture - samedi -': 'horairesSamedi',
        'id': 'id'
      };
      
      // Créer un mapping des indices de colonnes vers les noms de champs
      const columnMap: Record<number, string> = {};
      normalizedHeaders.forEach((header, index) => {
        const mappedField = fieldMap[header.toLowerCase()];
        if (mappedField) {
          columnMap[index] = mappedField;
          console.log(`Mapped header "${header}" to field "${mappedField}"`);
        } else {
          console.log(`No mapping found for header "${header}"`);
        }
      });
      
      // Préparer les documents
      const documents: Record<string, any>[] = [];
      
      // Traiter chaque ligne (sauf la première qui contient les en-têtes)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Diviser la ligne en valeurs
        const values = line.split(';');
        
        // Créer un document avec les valeurs par défaut
        const doc: Record<string, any> = {
          pole: '',
          nom: '',
          type: 'Laboratoire',
          adresse: '',
          ville: '',
          codePostal: '',
          telephone: '',
          email: '',
          codeBarres: '',
          tournees: [],
          codesPorte: '',
          coordonnees: '',
          statut: 'actif',
          complementAdresse: '',
          pays: 'France',
          horairesLV: '',
          horairesSamedi: ''
        };
        
        // Remplir le document avec les valeurs de la ligne
        let hasValidName = false;
        
        for (let j = 0; j < values.length; j++) {
          const fieldName = columnMap[j];
          if (!fieldName) continue;
          
          let value = values[j].trim();
          
          // Traitement spécial pour certains champs
          if (fieldName === 'tournees' && value) {
            // Convertir en tableau
            value = [value];
          } else if (fieldName === 'type' && value) {
            // Standardiser le type
            const lowerValue = value.toLowerCase();
            if (lowerValue.includes('labo') || lowerValue.includes('lab')) {
              value = 'Laboratoire';
            } else if (lowerValue.includes('site')) {
              value = 'Site';
            } else if (lowerValue.includes('client')) {
              value = 'Client';
            } else if (lowerValue.includes('point')) {
              value = 'Point de collecte';
            } else {
              value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
            }
          }
          
          // Assigner la valeur au document
          if (value !== '') {
            doc[fieldName] = value;
            
            // Vérifier si nous avons un nom valide
            if (fieldName === 'nom' && value) {
              hasValidName = true;
            }
          }
        }
        
        // Si nous n'avons pas de nom mais avons une adresse, utiliser l'adresse comme nom
        if (!hasValidName && !doc.nom && doc.adresse) {
          doc.nom = `Site - ${doc.adresse}`;
          hasValidName = true;
        }
        
        // Ajouter le document s'il a un nom ou un ID
        if (hasValidName || doc.id) {
          documents.push(doc);
        } else {
          console.warn(`⚠️ Ligne ${i + 1} ignorée: aucun nom ou identifiant valide trouvé`);
        }
      }
      
      if (documents.length === 0) {
        throw new Error('Aucun document valide n\'a pu être extrait du fichier.');
      }
      
      console.log(`✅ ${documents.length} sites valides extraits du fichier`);
      
      // Vider la collection si demandé
      if (clearCollection) {
        await this.clearCollection('sites');
      }
      
      // Importer les documents
      const totalDocuments = documents.length;
      let processedCount = 0;
      let importedCount = 0;
      
      while (processedCount < totalDocuments) {
        // Créer un nouveau lot pour chaque groupe de 500 documents
        const batch = writeBatch(db);
        const batchSize = Math.min(500, totalDocuments - processedCount);
        
        // Ajouter les documents au lot
        for (let i = 0; i < batchSize; i++) {
          const document = documents[processedCount + i];
          const docId = document[idField];
          
          if (docId && updateExisting) {
            // Mettre à jour ou créer le document avec l'ID spécifié
            const docRef = doc(db, 'sites', docId);
            batch.set(docRef, document);
          } else {
            // Créer un nouveau document avec un ID généré
            const collectionRef = collection(db, 'sites');
            const newDocRef = doc(collectionRef);
            batch.set(newDocRef, document);
          }
          
          importedCount++;
        }
        
        // Exécuter le lot
        await batch.commit();
        processedCount += batchSize;
        console.log(`✅ Lot de ${batchSize} sites importés (${processedCount}/${totalDocuments})`);
      }
      
      console.log(`✅ Importation terminée: ${importedCount} sites importés`);
      return importedCount;
    } catch (error) {
      console.error('❌ Erreur lors de l\'importation avec le format spécifique:', error);
      throw error;
    }
  }
}

export default new SharePointService(); 
