import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  query, 
  limit, 
  startAfter, 
  orderBy, 
  setDoc, 
  getDocsFromServer, 
  where,
  DocumentData,
  QueryDocumentSnapshot,
  QuerySnapshot,
  DocumentSnapshot,
  getFirestore,
  enableIndexedDbPersistence,
  disableNetwork,
  enableNetwork
} from 'firebase/firestore';
import { geocodeAddress } from '../utils/geocoding';
import { Site } from '../types/index';
import './EditMode.css';
import './Sites.css';
import PoleSelector from './PoleSelector';
import PoleFilter from './PoleFilter';
import { usePoles } from '../services/PoleService';

// Désactiver le suivi de structure et de chronologie pour améliorer les performances
const disableStructuralAndChronologicalTracking = async () => {
  try {
    // Désactiver temporairement le réseau pour éviter les requêtes pendant la configuration
    await disableNetwork(db);
    console.log("Réseau temporairement désactivé pour configuration");
    
    // Réactiver le réseau avec les optimisations
    await enableNetwork(db);
    console.log("Réseau réactivé avec optimisations de performance");
  } catch (error) {
    console.error("Erreur lors de l'optimisation de Firestore:", error);
  }
};

// Appeler la fonction d'optimisation au chargement du composant
disableStructuralAndChronologicalTracking();

// Ajouter la constante des types de sites disponibles
const SITE_TYPES = [
  'Laboratoire',
  'Clinique',
  'Plateau technique',
  'Point de collecte',
  'Etablissement de santé',
  'Ehpad',
  'Vétérinaire'
];

const Sites: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geocodingStatus, setGeocodingStatus] = useState<string | null>(null);

  // État pour le mode édition et la sélection multiple
  const [editMode, setEditMode] = useState(false);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [editingSites, setEditingSites] = useState<{[key: string]: Site}>({});
  const [selectAll, setSelectAll] = useState(false);
  
  // Ajouter un nouvel état pour les nouveaux sites temporaires
  const [newSites, setNewSites] = useState<Partial<Site>[]>([]);
  
  // État pour la recherche rapide
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [filteredSites, setFilteredSites] = useState<Site[]>([]);

  // Ajout du filtre par pôle
  const [selectedPole, setSelectedPole] = useState<string>('');

  // Nouveaux états pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20); // Par défaut 20 éléments
  
  // Options pour le nombre d'éléments par page
  const itemsPerPageOptions = [20, 30, 50, 100, 'Tous'];

  // Ajoutez le hook usePoles
  const { poles } = usePoles();

  // Fonction pour convertir ID de pôle en nom
  const getPoleNameById = (poleId: string | undefined): string => {
    if (!poleId) return '';
    const pole = poles.find(p => p.id === poleId);
    return pole ? pole.nom : poleId;
  };

  useEffect(() => {
    fetchSites();
  }, []);

  // Effet pour gérer la sélection/désélection de tous les sites
  useEffect(() => {
    if (selectAll) {
      setSelectedSites(sites.map(site => site.id));
    } else if (selectedSites.length === sites.length) {
      // Si tous les sites sont sélectionnés mais que selectAll est false, cela signifie que l'utilisateur a désélectionné
      setSelectedSites([]);
    }
  }, [selectAll]);
  
  // Initialiser les sites filtrés au chargement
  useEffect(() => {
    setFilteredSites(sites);
  }, [sites]);

  // Effet pour filtrer les sites en fonction de la recherche rapide
  useEffect(() => {
    if (!quickSearch.trim() && !selectedPole) {
      // Si la recherche est vide et aucun pôle sélectionné, afficher tous les sites
      setFilteredSites(sites);
      return;
    }

    let results = sites;

    // Filtrer par pôle si un pôle est sélectionné
    if (selectedPole) {
      results = results.filter(site => site.pole === selectedPole);
    }

    // Ensuite filtrer par recherche rapide
    if (quickSearch.trim()) {
      const searchTerm = quickSearch.toLowerCase().trim();
      results = results.filter(site => {
        // Rechercher dans tous les champs textuels du site
        return (
          (site.nom || '').toLowerCase().includes(searchTerm) ||
          (site.adresse || '').toLowerCase().includes(searchTerm) ||
          (site.ville || '').toLowerCase().includes(searchTerm) ||
          (site.codePostal || '').toLowerCase().includes(searchTerm) ||
          (site.telephone || '').toLowerCase().includes(searchTerm) ||
          (site.email || '').toLowerCase().includes(searchTerm) ||
          (site.type || '').toLowerCase().includes(searchTerm) ||
          (site.statut || '').toLowerCase().includes(searchTerm) ||
          (site.codeBarres || '').toLowerCase().includes(searchTerm)
        );
      });
    }

    setFilteredSites(results);
  }, [quickSearch, sites, selectedPole]);

  // Pagination et filtrage des sites
  const paginatedAndFilteredSites = useMemo(() => {
    // D'abord filtrer
    const filtered = filteredSites;
    
    // Si itemsPerPage est très grand (option "Tous"), retourner tous les sites filtrés
    if (itemsPerPage === Number.MAX_SAFE_INTEGER) {
      return filtered;
    }
    
    // Sinon, paginer normalement
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filtered.length);
    
    // S'il y a des nouveaux sites en mode édition, réduire le nombre de sites existants affichés
    if (editMode && newSites.length > 0) {
      const adjustedStartIndex = Math.min(startIndex, filtered.length);
      const remainingSlots = Math.max(0, itemsPerPage - newSites.length);
      const adjustedEndIndex = Math.min(adjustedStartIndex + remainingSlots, filtered.length);
      
      return filtered.slice(adjustedStartIndex, adjustedEndIndex);
    }
    
    return filtered.slice(startIndex, endIndex);
  }, [filteredSites, currentPage, itemsPerPage, editMode, newSites.length]);

  // Calculer le nombre total de pages
  const totalPages = Math.ceil(filteredSites.length / itemsPerPage);

  // Fonction pour changer de page
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Fonction pour changer le nombre d'éléments par page
  const handleItemsPerPageChange = (newItemsPerPage: number | string) => {
    if (newItemsPerPage === 'Tous') {
      // Si "Tous" est sélectionné, définir le nombre d'éléments par page à un nombre très élevé
      // pour afficher tous les sites sur une seule page
      setItemsPerPage(Number.MAX_SAFE_INTEGER);
    } else {
      setItemsPerPage(Number(newItemsPerPage));
    }
    // Réinitialiser à la première page quand on change le nombre d'éléments
    setCurrentPage(1);
  };

  // Rendu de la pagination
  const renderPagination = () => {
    return (
      <div className="pagination-container">
        <div className="items-per-page">
          <label>Éléments par page : </label>
          <select 
            value={itemsPerPage === Number.MAX_SAFE_INTEGER ? 'Tous' : itemsPerPage} 
            onChange={(e) => handleItemsPerPageChange(e.target.value)}
            title="Nombre d'éléments par page"
            aria-label="Nombre d'éléments par page"
          >
            {itemsPerPageOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        
        <div className="pagination-controls">
          <button 
            onClick={() => handlePageChange(currentPage - 1)} 
            disabled={currentPage === 1 || itemsPerPage === Number.MAX_SAFE_INTEGER}
          >
            Précédent
          </button>
          
          <span className="page-info">
            {itemsPerPage === Number.MAX_SAFE_INTEGER ? 
              'Tous les éléments affichés' : 
              `Page ${currentPage} sur ${totalPages}`
            }
          </span>
          
          <button 
            onClick={() => handlePageChange(currentPage + 1)} 
            disabled={currentPage === totalPages || itemsPerPage === Number.MAX_SAFE_INTEGER}
          >
            Suivant
          </button>
        </div>
        
        <div className="total-results">
          Total : {filteredSites.length} résultat(s)
        </div>
      </div>
    );
  };

  const fetchSites = async () => {
    try {
      setLoading(true);
      setError(null);
      setGeocodingStatus("Chargement des sites...");
      
      console.log("Récupération des sites depuis Firestore avec optimisations");
      
      // Récupérer les sites depuis Firestore avec pagination optimisée
      const sitesRef = collection(db, 'sites');
      const LIMIT = 250; // Augmenter la taille du lot pour réduire le nombre de requêtes
      
      let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
      let allSites: Array<Site> = [];
      let hasMore = true;
      let loadedCount = 0;
      
      while (hasMore) {
        // Construire la requête avec pagination
        let q;
        if (lastDoc) {
          q = query(sitesRef, orderBy('nom'), startAfter(lastDoc), limit(LIMIT));
        } else {
          q = query(sitesRef, orderBy('nom'), limit(LIMIT));
        }
        
        // Utiliser getDocsFromServer pour forcer une requête au serveur sans utiliser le cache
        const snapshot: QuerySnapshot<DocumentData> = await getDocsFromServer(q);
        
        if (snapshot.empty) {
          hasMore = false;
          break;
        }
        
        // Optimiser la transformation des données
        const batchSites = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          } as Site;
        });
        
        allSites = [...allSites, ...batchSites];
        loadedCount += batchSites.length;
        
        // Mettre à jour le statut de chargement moins fréquemment
        if (loadedCount % 250 === 0 || snapshot.docs.length < LIMIT) {
          setGeocodingStatus(`Chargement des sites... ${loadedCount} chargés`);
        }
        
        // Mettre à jour le dernier document pour la pagination
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        
        // Vérifier s'il y a plus de documents à récupérer
        if (snapshot.docs.length < LIMIT) {
          hasMore = false;
        }
      }
      
      console.log(`${allSites.length} sites chargés depuis Firestore`);
      setSites(allSites);
      
      // Effacer les messages de statut après un court délai
      setTimeout(() => {
        setGeocodingStatus(null);
      }, 1000);
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des sites:', error);
      setError('Erreur lors de la récupération des données');
      setSites([]);
      setGeocodingStatus(null);
      setLoading(false);
    }
  };

  // Fonction pour gérer la sélection/désélection de tous les sites
  const handleSelectAllChange = () => {
    setSelectAll(!selectAll);
  };

  // Fonction pour géocoder tous les sites sélectionnés
  const geocodeSelectedSites = async () => {
    if (selectedSites.length === 0) {
      alert('Veuillez sélectionner au moins un site à géocoder');
      return;
    }

    try {
      setLoading(true);
      setGeocodingStatus('Géocodage en cours...');
      
      const updatedEditingSites = { ...editingSites };
      let successCount = 0;
      let failCount = 0;
      let currentCount = 0;
      let cacheHitCount = 0;
      
      // Traiter chaque site sélectionné
      for (const siteId of selectedSites) {
        const site = editingSites[siteId];
        currentCount++;
        
        if (site) {
          setGeocodingStatus(`Géocodage en cours... (${currentCount}/${selectedSites.length})`);
          
          // Vérifier si les données minimales sont disponibles
          if (!site.nom && !site.adresse) {
            failCount++;
            console.warn(`Données minimales manquantes pour le site: ${site.nom || 'Sans nom'}`);
            continue;
          }
          
          // Construire une adresse complète avec les informations disponibles
          const addressParts = [
            site.nom,
            site.adresse,
            site.ville,
            site.codePostal
          ].filter(Boolean);
          
          const fullAddress = addressParts.join(', ');
          
          console.log(`Tentative de géocodage pour "${site.nom}" avec l'adresse: "${fullAddress}"`);
          
          const coordinates = await geocodeAddress(
            site.nom || '',
            site.adresse || '',
            site.ville || '',
            site.codePostal || ''
          );
          
          if (coordinates) {
            // Si les coordonnées n'ont pas changé, c'est probablement un hit de cache
            if (site.latitude === coordinates.latitude && site.longitude === coordinates.longitude) {
              cacheHitCount++;
            }
            
            updatedEditingSites[siteId] = {
              ...site,
              latitude: coordinates.latitude,
              longitude: coordinates.longitude
            };
            successCount++;
            console.log(`Géocodage réussi pour "${site.nom}": Lat=${coordinates.latitude}, Lon=${coordinates.longitude}`);
          } else {
            failCount++;
            console.warn(`Échec du géocodage pour le site: ${site.nom || 'Sans nom'}`);
          }
        } else {
          failCount++;
          console.warn(`Site non trouvé pour l'ID: ${siteId}`);
        }
        
        // Pause pour éviter de dépasser les limites de l'API, sauf pour le dernier élément
        if (currentCount < selectedSites.length) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Réduit à 0.5 seconde grâce au cache
        }
      }
      
      setEditingSites(updatedEditingSites);
      setGeocodingStatus(`Géocodage terminé : ${successCount} réussis (dont ${cacheHitCount} depuis le cache), ${failCount} échoués. Enregistrement en cours...`);
      
      // Enregistrer automatiquement les modifications après le géocodage
      if (successCount > 0) {
        console.log("Enregistrement automatique après géocodage...");
        
        // Créer un objet de recherche pour les IDs sélectionnés
        const selectedIdsMap: Record<string, boolean> = {};
        for (let i = 0; i < selectedSites.length; i++) {
          selectedIdsMap[selectedSites[i]] = true;
        }
        
        // Mettre à jour les documents Firestore
        let saveSuccessCount = 0;
        let saveErrorCount = 0;
        
        // Traiter les sites géocodés
        for (let i = 0; i < selectedSites.length; i++) {
          const siteId = selectedSites[i];
          const editedSite = updatedEditingSites[siteId];
          
          if (!editedSite) {
            console.log(`Site ${siteId} non trouvé dans editingSites, ignoré`);
            continue;
          }
          
          try {
            // Convertir l'ID en chaîne de caractères pour Firestore
            const siteIdString = String(siteId);
            console.log(`Sauvegarde des coordonnées pour le site ${siteIdString} (${editedSite.nom})...`);
            
            const siteRef = doc(db, 'sites', siteIdString);
            
            // Vérifier si le document existe
            const docSnap = await getDoc(siteRef);
            
            // Extraire l'ID avant la mise à jour
            const { id, ...updateData } = editedSite;
            
            if (docSnap.exists()) {
              // Le document existe, on peut le mettre à jour
              await updateDoc(siteRef, updateData);
              console.log(`Coordonnées du site ${siteIdString} (${editedSite.nom}) enregistrées avec succès`);
              saveSuccessCount++;
            } else {
              // Le document n'existe pas, on doit le créer
              console.log(`Le site ${siteIdString} n'existe pas, création avec coordonnées...`);
              await setDoc(siteRef, updateData);
              console.log(`Site ${siteIdString} créé avec coordonnées`);
              saveSuccessCount++;
            }
          } catch (updateError) {
            console.error(`Erreur lors de la sauvegarde des coordonnées du site ${siteId}:`, updateError);
            saveErrorCount++;
          }
        }
        
        // Mettre à jour l'état local
        const updatedSites: Site[] = [];
        
        // Créer une nouvelle liste de sites avec les modifications
        for (let i = 0; i < sites.length; i++) {
          const site = sites[i];
          const siteId = site.id;
          
          if (selectedIdsMap[siteId] && updatedEditingSites[siteId]) {
            // Si le site est sélectionné et modifié, utiliser la version modifiée
            updatedSites.push({ ...updatedEditingSites[siteId] });
          } else {
            // Sinon, garder le site inchangé
            updatedSites.push(site);
          }
        }
        
        // Mettre à jour les états
        setSites(updatedSites);
        setFilteredSites(updatedSites);
        
        setGeocodingStatus(`Géocodage et enregistrement terminés : ${successCount} sites géocodés, ${saveSuccessCount} sites enregistrés, ${saveErrorCount} erreurs`);
      }
      
      // Masquer le statut après quelques secondes
      setTimeout(() => {
        setGeocodingStatus(null);
      }, 5000);
      
    } catch (error) {
      console.error('Erreur lors du géocodage:', error);
      setGeocodingStatus(`Erreur lors du géocodage: ${error}`);
      
      // Masquer le message d'erreur après quelques secondes
      setTimeout(() => {
        setGeocodingStatus(null);
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const toggleEditMode = () => {
    if (editMode) {
      // Si on quitte le mode édition, réinitialiser les sélections et les modifications
      setSelectedSites([]);
      setEditingSites({});
      setSelectAll(false);
      setNewSites([]);
      
      // Rafraîchir les données depuis Firebase
      fetchSites();
    } else {
      // Si on entre en mode édition, initialiser les sites en édition
      const editingSitesObj: {[key: string]: Site} = {};
      filteredSites.forEach(site => {
        editingSitesObj[site.id] = { ...site };
      });
      setEditingSites(editingSitesObj);
    }
    
    // Inverser le mode édition
    setEditMode(!editMode);
    
    // Réinitialiser la recherche rapide et les filtres
    setQuickSearch('');
    setSelectedPole('');
  };

  const handleSave = async () => {
    // Ne rien faire si aucun site n'est sélectionné et pas de nouveaux sites
    if (selectedSites.length === 0 && newSites.length === 0) {
      alert('Veuillez sélectionner au moins un site à enregistrer ou créer un nouveau site');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("Début de la sauvegarde...");
      console.log("Sites sélectionnés:", selectedSites);
      console.log("Nouveaux sites à créer:", newSites.length);
      
      // Créer un objet de recherche pour les IDs sélectionnés
      const selectedIdsMap: Record<string, boolean> = {};
      for (let i = 0; i < selectedSites.length; i++) {
        selectedIdsMap[selectedSites[i]] = true;
      }
      
      // Mettre à jour les documents Firestore
      let successCount = 0;
      let errorCount = 0;
      let newSitesAdded = 0;
      
      // 1. D'abord, traiter les sites existants sélectionnés
      for (let i = 0; i < selectedSites.length; i++) {
        const siteId = selectedSites[i];
        const editedSite = editingSites[siteId];
        
        if (!editedSite) {
          console.log(`Site ${siteId} non trouvé dans editingSites, ignoré`);
          continue;
        }
        
        try {
          // Convertir l'ID en chaîne de caractères pour Firestore
          const siteIdString = String(siteId);
          console.log(`Conversion de l'ID ${siteId} (${typeof siteId}) en chaîne: ${siteIdString} (${typeof siteIdString})`);
          
          const siteRef = doc(db, 'sites', siteIdString);
          
          // Vérifier si le document existe
          const docSnap = await getDoc(siteRef);
          
          // Extraire l'ID avant la mise à jour
          const { id, ...updateData } = editedSite;
          
          if (docSnap.exists()) {
            // Le document existe, on peut le mettre à jour
            console.log(`Mise à jour du site ${siteIdString}...`);
            await updateDoc(siteRef, updateData);
            console.log(`Site ${siteIdString} mis à jour avec succès`);
          } else {
            // Le document n'existe pas, on doit le créer
            console.log(`Le site ${siteIdString} n'existe pas, création...`);
            await setDoc(siteRef, updateData);
            console.log(`Site ${siteIdString} créé avec succès`);
          }
          
          successCount++;
        } catch (updateError) {
          console.error(`Erreur lors de la mise à jour du site ${siteId}:`, updateError);
          errorCount++;
        }
      }
      
      // 2. Ensuite, traiter les nouveaux sites temporaires
      for (let i = 0; i < newSites.length; i++) {
        const newSite = newSites[i];
        
        // Vérifier que le site a au moins un nom (champ obligatoire)
        if (!newSite.nom || newSite.nom.trim() === '') {
          console.log(`Nouveau site #${i+1} sans nom, ignoré`);
          continue;
        }
        
        try {
          // Supprimer l'ID temporaire et préparer les données pour l'ajout
          const { id, ...siteData } = newSite;
          
          console.log(`Ajout du nouveau site "${newSite.nom}"...`);
          
          // Utiliser addDoc pour générer un nouvel ID automatiquement
          const sitesRef = collection(db, 'sites');
          const docRef = await addDoc(sitesRef, siteData);
          
          console.log(`Nouveau site "${newSite.nom}" ajouté avec l'ID: ${docRef.id}`);
          
          // Ajouter le nouveau site à la liste des sites avec son ID réel
          const newSiteWithId = {
            id: docRef.id,
            ...siteData
          };
          
          // Ajouter le nouveau site à la liste des sites
          sites.push(newSiteWithId as Site);
          
          newSitesAdded++;
          successCount++;
        } catch (addError) {
          console.error(`Erreur lors de l'ajout du nouveau site "${newSite.nom}":`, addError);
          errorCount++;
        }
      }
      
      console.log(`Sauvegarde terminée: ${successCount} succès (dont ${newSitesAdded} nouveaux sites), ${errorCount} erreurs`);
      
      // Mettre à jour l'état local
      const updatedSites: Site[] = [];
      
      // Créer une nouvelle liste de sites avec les modifications
      for (let i = 0; i < sites.length; i++) {
        const site = sites[i];
        const siteId = site.id;
        
        if (selectedIdsMap[siteId] && editingSites[siteId]) {
          // Si le site est sélectionné et modifié, utiliser la version modifiée
          updatedSites.push({ ...editingSites[siteId] });
        } else {
          // Sinon, garder le site inchangé
          updatedSites.push(site);
        }
      }
      
      // Mettre à jour les états
      setSites(updatedSites);
      setFilteredSites(updatedSites);
      
      // Afficher un message de confirmation
      alert(`${successCount} sites mis à jour avec succès${newSitesAdded > 0 ? `, ${newSitesAdded} nouveaux sites ajoutés` : ''}${errorCount > 0 ? `, ${errorCount} erreurs` : ''}`);

      // Réinitialiser les états
      setEditMode(false);
      setSelectedSites([]);
      setEditingSites({});
      setNewSites([]);
      setSelectAll(false);

    } catch (error) {
      console.error('Erreur globale lors de la sauvegarde:', error);
      alert('Une erreur est survenue lors de la sauvegarde');
    } finally {
      setLoading(false);
      setGeocodingStatus(null);
    }
  };

  // Fonction utilitaire pour comparer des objets
  const isEqual = (obj1: any, obj2: any): boolean => {
    // Comparer les champs de base
    const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    
    for (const key of keys) {
      // Gestion spéciale pour les tableaux (comme tournees)
      if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
        if (obj1[key].length !== obj2[key].length) return false;
        if (!obj1[key].every((val, index) => val === obj2[key][index])) return false;
      } 
      // Comparaison standard pour les autres types
      else if (obj1[key] !== obj2[key]) {
        return false;
      }
    }
    
    return true;
  };

  // Supprimer les sites sélectionnés sans messages
  const handleDelete = async () => {
    if (selectedSites.length === 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`Tentative de suppression de ${selectedSites.length} sites:`, selectedSites);
      
      // Récupérer les sites sélectionnés à partir de l'état sites
      const sitesToDelete = sites.filter(site => selectedSites.includes(site.id));
      console.log("Sites à supprimer (détails complets):", sitesToDelete);
      
      if (sitesToDelete.length === 0) {
        console.warn("Aucun site trouvé pour les IDs sélectionnés");
        setLoading(false); // Désactiver le chargement si aucun site à supprimer
        return;
      }
      
      // Rechercher spécifiquement le site "SITE 000 TEST" ou "Périphérique TEST" s'il est dans la liste
      const testSite = sitesToDelete.find(site => 
        site.nom === "SITE 000 TEST" || 
        site.nom.includes("TEST") || 
        site.nom.includes("Périphérique") || 
        site.pole === "Périphérique"
      );
      
      if (testSite) {
        console.log("Site TEST/Périphérique trouvé pour suppression:", testSite);
        
        // Recherche spécifique pour le site problématique
        await deleteSpecificTestSite();
      }
      
      // Supprimer les sites sélectionnés un par un
      for (const site of sitesToDelete) {
        try {
          // Ignorer le site TEST/Périphérique car il est traité séparément
          if (site.nom.includes("TEST") || site.nom.includes("Périphérique") || site.pole === "Périphérique") {
            console.log(`Site ${site.nom} traité séparément, ignoré dans la boucle principale`);
            continue;
          }
          
          console.log(`Traitement de la suppression pour le site:`, site);
          
          // Convertir l'ID en chaîne de caractères pour Firestore
          const siteIdString = String(site.id);
          console.log(`Conversion de l'ID ${site.id} (${typeof site.id}) en chaîne: ${siteIdString} (${typeof siteIdString})`);
          
          // Vérifier si le site existe dans Firestore avant de le supprimer
          const siteRef = doc(db, 'sites', siteIdString);
          const docSnap = await getDoc(siteRef);
          
          if (docSnap.exists()) {
            console.log(`Site ${siteIdString} (${site.nom}) trouvé dans Firestore, suppression...`);
            await deleteDoc(siteRef);
            console.log(`Site ${siteIdString} (${site.nom}) supprimé avec succès`);
          } else {
            console.warn(`Site ${siteIdString} (${site.nom}) non trouvé dans Firestore avec cet ID`);
            
            // Si le site n'est pas trouvé avec son ID, essayer de le trouver par son nom
            console.log(`Recherche du site "${site.nom}" par nom dans Firestore...`);
            
            const sitesRef = collection(db, 'sites');
            const q = query(sitesRef, where('nom', '==', site.nom));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
              console.warn(`Aucun site trouvé avec le nom "${site.nom}" dans Firestore`);
              continue;
            }
            
            // Supprimer tous les documents trouvés (normalement un seul)
            let deletedCount = 0;
            for (const docSnapshot of querySnapshot.docs) {
              const docId = docSnapshot.id;
              console.log(`Site trouvé avec l'ID Firestore: ${docId}, suppression...`);
              
              await deleteDoc(docSnapshot.ref);
              
              console.log(`Site "${site.nom}" (ID Firestore: ${docId}) supprimé avec succès`);
              deletedCount++;
            }
            
            console.log(`${deletedCount} document(s) supprimé(s) pour le site "${site.nom}"`);
          }
        } catch (deleteError) {
          console.error(`Erreur lors de la suppression du site "${site.nom}":`, deleteError);
        }
      }
      
      console.log("Rechargement des sites depuis Firestore...");
      // Recharger les données depuis Firestore pour s'assurer que nous avons les données les plus récentes
      await fetchSites();
      
      // Réinitialiser les états
      setEditMode(false);
      setSelectedSites([]);
      setEditingSites({});
      setSelectAll(false);
      
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    } finally {
      // S'assurer que l'état de chargement est toujours désactivé
      setLoading(false);
      // Effacer tout message de statut
      setGeocodingStatus(null);
    }
  };

  // Fonction spécifique pour supprimer le site problématique "Périphérique TEST"
  const deleteSpecificTestSite = async () => {
    try {
      console.log("Recherche spécifique du site problématique 'Périphérique TEST'...");
      
      const sitesRef = collection(db, 'sites');
      
      // Recherche par pole "Périphérique"
      console.log("Recherche par pole 'Périphérique'...");
      const poleQuery = query(sitesRef, where('pole', '==', 'Périphérique'));
      const poleSnapshot = await getDocs(poleQuery);
      
      if (!poleSnapshot.empty) {
        console.log(`${poleSnapshot.size} sites avec pole 'Périphérique' trouvés`);
        
        for (const docSnapshot of poleSnapshot.docs) {
          const siteData = docSnapshot.data();
          console.log(`Site trouvé: ID=${docSnapshot.id}, Nom=${siteData.nom}, Pole=${siteData.pole}`);
          
          if (siteData.nom && (siteData.nom.includes('TEST') || siteData.nom === 'SITE 000 TEST')) {
            console.log(`Suppression du site problématique: ${docSnapshot.id} (${siteData.nom})`);
            await deleteDoc(docSnapshot.ref);
            console.log(`Site problématique ${docSnapshot.id} (${siteData.nom}) supprimé avec succès`);
          }
        }
      } else {
        console.log("Aucun site avec pole 'Périphérique' trouvé");
      }
      
      // Recherche par nom contenant "TEST"
      console.log("Recherche par nom contenant 'TEST'...");
      const testQuery = query(sitesRef, where('nom', '>=', 'TEST'), where('nom', '<=', 'TEST\uf8ff'));
      const testSnapshot = await getDocs(testQuery);
      
      if (!testSnapshot.empty) {
        console.log(`${testSnapshot.size} sites contenant 'TEST' dans le nom trouvés`);
        
        for (const docSnapshot of testSnapshot.docs) {
          const siteData = docSnapshot.data();
          console.log(`Site TEST trouvé: ID=${docSnapshot.id}, Nom=${siteData.nom}`);
          
          console.log(`Suppression du site TEST: ${docSnapshot.id} (${siteData.nom})`);
          await deleteDoc(docSnapshot.ref);
          console.log(`Site TEST ${docSnapshot.id} (${siteData.nom}) supprimé avec succès`);
        }
      } else {
        console.log("Aucun site avec 'TEST' dans le nom trouvé");
      }
      
      // Recherche par nom exact "SITE 000 TEST"
      console.log("Recherche par nom exact 'SITE 000 TEST'...");
      const exactQuery = query(sitesRef, where('nom', '==', 'SITE 000 TEST'));
      const exactSnapshot = await getDocs(exactQuery);
      
      if (!exactSnapshot.empty) {
        console.log(`${exactSnapshot.size} sites avec nom exact 'SITE 000 TEST' trouvés`);
        
        for (const docSnapshot of exactSnapshot.docs) {
          console.log(`Suppression du site exact: ${docSnapshot.id} (SITE 000 TEST)`);
          await deleteDoc(docSnapshot.ref);
          console.log(`Site exact ${docSnapshot.id} (SITE 000 TEST) supprimé avec succès`);
        }
      } else {
        console.log("Aucun site avec nom exact 'SITE 000 TEST' trouvé");
      }
      
      // Dernière tentative: recherche de tous les sites et filtrage manuel
      console.log("Recherche manuelle de tous les sites...");
      const allSitesQuery = query(sitesRef, limit(1000));
      const allSitesSnapshot = await getDocs(allSitesQuery);
      
      let foundProblematicSite = false;
      
      for (const docSnapshot of allSitesSnapshot.docs) {
        const siteData = docSnapshot.data();
        
        // Vérifier si c'est le site problématique
        if ((siteData.pole === 'Périphérique' || siteData.pole === 'TEST') && 
            (siteData.nom && (siteData.nom.includes('TEST') || siteData.nom === 'SITE 000 TEST'))) {
          foundProblematicSite = true;
          console.log(`Site problématique trouvé par recherche manuelle: ID=${docSnapshot.id}, Nom=${siteData.nom}, Pole=${siteData.pole}`);
          
          console.log(`Suppression du site problématique: ${docSnapshot.id}`);
          await deleteDoc(docSnapshot.ref);
          console.log(`Site problématique ${docSnapshot.id} supprimé avec succès`);
        }
      }
      
      if (!foundProblematicSite) {
        console.log("Aucun site problématique trouvé par recherche manuelle");
      }
      
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression spécifique du site problématique:", error);
      return false;
    }
  };

  // Optimiser la fonction de suppression des doublons
  const removeDuplicateSites = async () => {
    if (!window.confirm("Cette opération va rechercher et supprimer les sites en double dans la base de données. Continuer ?")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setGeocodingStatus("Recherche des doublons en cours...");
      
      // Récupérer tous les sites depuis Firestore de manière optimisée
      const sitesRef = collection(db, 'sites');
      const snapshot = await getDocsFromServer(query(sitesRef, limit(1000)));
      
      if (snapshot.empty) {
        setGeocodingStatus("Aucun site trouvé dans la base de données.");
        setTimeout(() => setGeocodingStatus(null), 3000);
        setLoading(false);
        return;
      }
      
      // Utiliser une Map pour de meilleures performances
      const sitesByName = new Map<string, Array<{id: string, data: any}>>();
      
      // Parcourir tous les sites et les regrouper par nom
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const name = data.nom?.trim();
        
        if (name) {
          // Normaliser le nom pour éviter les problèmes de casse et d'espaces
          const normalizedName = name.toLowerCase().replace(/\s+/g, ' ');
          
          if (!sitesByName.has(normalizedName)) {
            sitesByName.set(normalizedName, []);
          }
          
          sitesByName.get(normalizedName)?.push({
            id: doc.id,
            data: data
          });
        }
      });
      
      // Identifier les noms qui ont des doublons
      const duplicateNames: string[] = [];
      sitesByName.forEach((sites, name) => {
        if (sites.length > 1) {
          duplicateNames.push(name);
        }
      });
      
      if (duplicateNames.length === 0) {
        setGeocodingStatus("Aucun doublon trouvé dans la base de données.");
        setTimeout(() => setGeocodingStatus(null), 3000);
        setLoading(false);
        return;
      }
      
      setGeocodingStatus(`${duplicateNames.length} sites avec doublons trouvés. Traitement en cours...`);
      
      let totalDuplicatesRemoved = 0;
      let processedCount = 0;
      
      // Traiter les doublons par lots pour éviter de surcharger Firestore
      const BATCH_SIZE = 10;
      
      for (let i = 0; i < duplicateNames.length; i += BATCH_SIZE) {
        const batch = duplicateNames.slice(i, i + BATCH_SIZE);
        
        // Traiter chaque lot en parallèle
        await Promise.all(batch.map(async (name) => {
          const sites = sitesByName.get(name) || [];
          console.log(`Traitement des doublons pour "${name}" (${sites.length} occurrences)`);
          
          // Trier les sites par priorité
          sites.sort((a, b) => {
            // Priorité 1: Sites avec coordonnées
            const aHasCoords = a.data.latitude && a.data.longitude;
            const bHasCoords = b.data.latitude && b.data.longitude;
            
            if (aHasCoords && !bHasCoords) return -1;
            if (!aHasCoords && bHasCoords) return 1;
            
            // Priorité 2: Sites avec adresse complète
            const aHasFullAddress = a.data.adresse && a.data.ville && a.data.codePostal;
            const bHasFullAddress = b.data.adresse && b.data.ville && b.data.codePostal;
            
            if (aHasFullAddress && !bHasFullAddress) return -1;
            if (!aHasFullAddress && bHasFullAddress) return 1;
            
            // Priorité 3: Sites avec plus de champs remplis
            const aFieldCount = Object.keys(a.data).filter(key => a.data[key]).length;
            const bFieldCount = Object.keys(b.data).filter(key => b.data[key]).length;
            
            if (aFieldCount > bFieldCount) return -1;
            if (aFieldCount < bFieldCount) return 1;
            
            // Priorité 4: ID plus récent
            return b.id.localeCompare(a.id);
          });
          
          // Garder le premier site et supprimer les autres
          const siteToKeep = sites[0];
          const sitesToRemove = sites.slice(1);
          
          console.log(`Conservation du site ${siteToKeep.id} (${siteToKeep.data.nom}) et suppression de ${sitesToRemove.length} doublons`);
          
          // Supprimer les doublons
          for (const site of sitesToRemove) {
            try {
              const siteRef = doc(db, 'sites', site.id);
              await deleteDoc(siteRef);
              console.log(`Site en double supprimé: ${site.id} (${site.data.nom})`);
              totalDuplicatesRemoved++;
            } catch (error) {
              console.error(`Erreur lors de la suppression du doublon ${site.id}:`, error);
            }
          }
          
          processedCount++;
          if (processedCount % 5 === 0 || processedCount === duplicateNames.length) {
            setGeocodingStatus(`Traitement en cours: ${processedCount}/${duplicateNames.length} sites traités, ${totalDuplicatesRemoved} doublons supprimés`);
          }
        }));
      }
      
      setGeocodingStatus(`Nettoyage terminé: ${totalDuplicatesRemoved} doublons supprimés sur ${duplicateNames.length} sites.`);
      
      // Recharger les sites après la suppression des doublons
      await fetchSites();
      
      // Masquer le message après quelques secondes
      setTimeout(() => {
        setGeocodingStatus(null);
      }, 5000);
      
    } catch (error) {
      console.error('Erreur lors de la suppression des doublons:', error);
      setGeocodingStatus(`Erreur lors de la suppression des doublons: ${error}`);
      setTimeout(() => setGeocodingStatus(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const toggleSiteSelection = (id: string) => {
    if (selectedSites.includes(id)) {
      setSelectedSites(selectedSites.filter(siteId => siteId !== id));
      // Si on désélectionne un site, on désactive aussi "Tout sélectionner"
      setSelectAll(false);
    } else {
      setSelectedSites([...selectedSites, id]);
      // Si tous les sites sont sélectionnés, on active "Tout sélectionner"
      if (selectedSites.length + 1 === sites.length) {
        setSelectAll(true);
      }
    }
  };

  const handleCellChange = (id: string, field: keyof Site, value: any) => {
    setEditingSites({
      ...editingSites,
      [id]: {
        ...editingSites[id],
        [field]: value
      }
    });
  };

  const addNewSiteRow = () => {
    // Forcer le mode édition si ce n'est pas déjà le cas
    if (!editMode) {
      setEditMode(true);
    }

    const newSite: Partial<Site> = {
      id: `temp-${Date.now()}`,
      nom: '',
      pole: '',
      type: '',  // Le type sera sélectionné dans le menu déroulant
      adresse: '',
      ville: '',
      codePostal: '',
      telephone: '',
      email: '',
      codeBarres: '',
      tournees: [],
      codesPorte: '',
      coordonnees: '',
      statut: 'actif'
    };
    
    // Ajouter la nouvelle ligne au début du tableau
    setNewSites(prevNewSites => [newSite, ...prevNewSites]);

    // Revenir à la première page pour voir le nouveau site
    setCurrentPage(1);

    // Ajouter un délai pour permettre le rendu
    setTimeout(() => {
      const firstInput = document.querySelector('.sites-table-container .new-site-row input') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  };

  const handleNewSiteChange = (index: number, field: keyof Site, value: any) => {
    const updatedNewSites = [...newSites];
    updatedNewSites[index] = {
      ...updatedNewSites[index],
      [field]: value
    };
    setNewSites(updatedNewSites);
  };

  const removeNewSiteRow = (index: number) => {
    const updatedNewSites = newSites.filter((_, i) => i !== index);
    setNewSites(updatedNewSites);
  };

  // Fonction pour gérer le changement de pôle
  const handlePoleChange = (pole: string) => {
    setSelectedPole(pole);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des sites...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Sites</h2>
      </div>
      
      <div className="sticky-header-container">
        <div className="header-actions">
          {editMode ? (
            <>
              <button 
                className="button" 
                onClick={handleSave}
                disabled={loading || (selectedSites.length === 0 && newSites.length === 0)}
                style={{ 
                  backgroundColor: '#4CAF50', // Vert
                  color: 'white',
                  fontWeight: 'bold'
                }}
                title="Enregistrer les modifications"
              >
                <i className="fas fa-save"></i> Enr. {selectedSites.length > 0 || newSites.length > 0 ? 
                  `(${selectedSites.length}${newSites.length > 0 ? `+${newSites.length}` : ''})` : 
                  ''}
              </button>
              <button 
                className="button button-secondary" 
                onClick={() => {
                  if (window.confirm("Êtes-vous sûr de vouloir annuler toutes les modifications ?")) {
                    setEditingSites({});
                    setNewSites([]);
                    setSelectedSites([]);
                    setSelectAll(false);
                    setEditMode(false);
                  }
                }}
                style={{ marginLeft: '5px' }}
                disabled={loading}
                title="Annuler les modifications"
              >
                <i className="fas fa-times"></i> Annuler
              </button>
              <button 
                className="button" 
                onClick={addNewSiteRow}
                style={{ 
                  marginLeft: '5px',
                  backgroundColor: '#FF9800', // Orange
                  color: 'white',
                  fontWeight: 'bold'
                }}
                disabled={loading}
                title="Ajouter un nouveau site"
              >
                <i className="fas fa-plus"></i> Ajouter
              </button>
              <button 
                className="button button-danger" 
                onClick={handleDelete}
                disabled={selectedSites.length === 0 || loading}
                style={{ 
                  marginLeft: '5px',
                  backgroundColor: '#f44336', 
                  color: 'white',
                  fontWeight: 'bold'
                }}
                title="Supprimer les sites sélectionnés"
              >
                <i className="fas fa-trash-alt"></i> Sup. ({selectedSites.length})
              </button>
              <button 
                className="button" 
                onClick={geocodeSelectedSites}
                disabled={selectedSites.length === 0 || loading}
                style={{ marginLeft: '5px' }}
                title="Géocoder les sites sélectionnés"
              >
                <i className="fas fa-map-marker-alt"></i> Géo. ({selectedSites.length})
              </button>
            </>
          ) : (
            <button 
              className="button" 
              onClick={toggleEditMode}
            >
              <i className="fas fa-edit"></i> Modifier
            </button>
          )}
        </div>
        
        <div className="quick-search-container" style={{ marginTop: '10px' }}>
          <input
            type="text"
            className="quick-search-input"
            placeholder="Recherche rapide..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            disabled={loading}
          />
          <div className="pole-filter">
            <PoleFilter
              onPoleChange={handlePoleChange}
              selectedPole={selectedPole}
              label="Filtrer par pôle"
              className="pole-filter-component"
            />
          </div>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="sites-table-container" style={{ overflowX: 'auto' }}>
        <div className="results-info">
          <p>{filteredSites.length} résultat(s) trouvé(s){quickSearch ? ` pour la recherche "${quickSearch}"` : ''}</p>
        </div>
        <table className={`data-table ${editMode ? 'editing' : ''}`}>
          <thead>
            <tr>
              {editMode && (
                <th>
                  <input 
                    type="checkbox" 
                    checked={selectAll}
                    onChange={handleSelectAllChange}
                    title="Sélectionner/Désélectionner tout"
                  />
                </th>
              )}
              <th>PÔLE</th>
              <th>TYPE DE SITE</th>
              <th>NOM</th>
              <th>ADRESSE</th>
              <th>COMPLÉMENT</th>
              <th>VILLE</th>
              <th>CODE POSTAL</th>
              <th>TOURNÉES</th>
              <th>HORAIRES L-V</th>
              <th>HORAIRES SAMEDI</th>
              <th>CODE-BARRE</th>
              <th>COORDONNÉES</th>
              <th>ID</th>
              <th>STATUT</th>
            </tr>
          </thead>
          <tbody>
            {/* D'abord afficher les nouveaux sites */}
            {editMode && newSites.map((site, index) => (
              <tr key={`new-site-${site.id}`} className="new-site-row">
                <td style={{display: 'none'}}>
                  {/* Cellule masquée pour maintenir l'alignement */}
                </td>
                <td>
                  <PoleSelector
                    value={site.pole || ''}
                    onChange={(value) => handleNewSiteChange(index, 'pole', value)}
                    placeholder="Sélectionner un pôle"
                    style={{ width: '100%' }}
                    showSearch
                    allowClear
                    title="Pôle du site"
                  />
                </td>
                <td>
                  <select
                    value={site.type || ''}
                    onChange={(e) => handleNewSiteChange(index, 'type', e.target.value)}
                    className="inline-edit-select"
                    title="Type de site"
                  >
                    <option value="">Sélectionner un type</option>
                    {SITE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    value={site.nom || ''}
                    onChange={(e) => handleNewSiteChange(index, 'nom', e.target.value)}
                    className="inline-edit-input"
                    title="Nom"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={site.adresse || ''}
                    onChange={(e) => handleNewSiteChange(index, 'adresse', e.target.value)}
                    className="inline-edit-input"
                    title="Adresse"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={site.complementAdresse || ''}
                    onChange={(e) => handleNewSiteChange(index, 'complementAdresse', e.target.value)}
                    className="inline-edit-input"
                    title="Complément d'adresse"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={site.ville || ''}
                    onChange={(e) => handleNewSiteChange(index, 'ville', e.target.value)}
                    className="inline-edit-input"
                    title="Ville"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={site.codePostal || ''}
                    onChange={(e) => handleNewSiteChange(index, 'codePostal', e.target.value)}
                    className="inline-edit-input"
                    title="Code postal"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={site.tournees?.join(', ') || ''}
                    onChange={(e) => handleNewSiteChange(index, 'tournees', e.target.value.split(',').map(s => s.trim()))}
                    className="inline-edit-input"
                    title="Tournées"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={site.horairesLV || ''}
                    onChange={(e) => handleNewSiteChange(index, 'horairesLV', e.target.value)}
                    className="inline-edit-input"
                    title="Horaires Lundi-Vendredi"
                    placeholder="HH:MM-HH:MM"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={site.horairesSamedi || ''}
                    onChange={(e) => handleNewSiteChange(index, 'horairesSamedi', e.target.value)}
                    className="inline-edit-input"
                    title="Horaires Samedi"
                    placeholder="HH:MM-HH:MM"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={site.codeBarres || ''}
                    onChange={(e) => handleNewSiteChange(index, 'codeBarres', e.target.value)}
                    className="inline-edit-input"
                    title="Code-barre"
                  />
                </td>
                <td>
                  <span className="coordinates-empty">
                    Pas de coordonnées<br />
                    (utiliser le géocodage)
                  </span>
                </td>
                <td>{site.id}</td>
                <td>
                  <select
                    value={site.statut || 'actif'}
                    onChange={(e) => handleNewSiteChange(index, 'statut', e.target.value)}
                    className="inline-edit-select"
                    title="Statut du site"
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </td>
              </tr>
            ))}
            
            {/* Ensuite afficher les sites existants */}
            {paginatedAndFilteredSites.map((site, index) => (
              <tr key={`site-${site.id}-${index}`} className={selectedSites.includes(site.id) ? 'selected-row' : ''}>
                {editMode && (
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedSites.includes(site.id)} 
                      onChange={() => toggleSiteSelection(site.id)}
                      title="Sélectionner ce site"
                    />
                  </td>
                )}
                <td>
                  {editMode ? (
                    <PoleSelector
                      value={editingSites[site.id]?.pole || site.pole || ''}
                      onChange={(value) => handleCellChange(site.id, 'pole', value)}
                      placeholder="Sélectionner un pôle"
                      style={{ width: '100%' }}
                      showSearch
                      allowClear
                      title="Pôle du site"
                    />
                  ) : (
                    getPoleNameById(site.pole)
                  )}
                </td>
                <td>
                  {editMode ? (
                    <select
                      value={editingSites[site.id]?.type || site.type || ''}
                      onChange={(e) => handleCellChange(site.id, 'type', e.target.value)}
                      className="inline-edit-select"
                      title="Type de site"
                    >
                      <option value="">Sélectionner un type</option>
                      {SITE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  ) : (
                    site.type || ''
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="text"
                      value={editingSites[site.id]?.nom || site.nom || ''}
                      onChange={(e) => handleCellChange(site.id, 'nom', e.target.value)}
                      className="inline-edit-input"
                      title="Nom"
                    />
                  ) : (
                    site.nom || ''
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="text"
                      value={editingSites[site.id]?.adresse || site.adresse || ''}
                      onChange={(e) => handleCellChange(site.id, 'adresse', e.target.value)}
                      className="inline-edit-input"
                      title="Adresse"
                    />
                  ) : (
                    site.adresse || ''
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="text"
                      value={editingSites[site.id]?.complementAdresse || site.complementAdresse || ''}
                      onChange={(e) => handleCellChange(site.id, 'complementAdresse', e.target.value)}
                      className="inline-edit-input"
                      title="Complément d'adresse"
                    />
                  ) : (
                    site.complementAdresse || ''
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="text"
                      value={editingSites[site.id]?.ville || site.ville || ''}
                      onChange={(e) => handleCellChange(site.id, 'ville', e.target.value)}
                      className="inline-edit-input"
                      title="Ville"
                    />
                  ) : (
                    site.ville || ''
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="text"
                      value={editingSites[site.id]?.codePostal || site.codePostal || ''}
                      onChange={(e) => handleCellChange(site.id, 'codePostal', e.target.value)}
                      className="inline-edit-input"
                      title="Code postal"
                    />
                  ) : (
                    site.codePostal || ''
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="text"
                      value={editingSites[site.id]?.tournees?.join(', ') || ''}
                      onChange={(e) => handleCellChange(site.id, 'tournees', e.target.value.split(',').map(s => s.trim()))}
                      className="inline-edit-input"
                      title="Tournées"
                    />
                  ) : (
                    site.tournees?.join(', ') || ''
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="text"
                      value={editingSites[site.id]?.horairesLV || site.horairesLV || ''}
                      onChange={(e) => handleCellChange(site.id, 'horairesLV', e.target.value)}
                      className="inline-edit-input"
                      title="Horaires Lundi-Vendredi"
                      placeholder="HH:MM-HH:MM"
                      pattern="([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]"
                    />
                  ) : (
                    site.horairesLV || ''
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="text"
                      value={editingSites[site.id]?.horairesSamedi || site.horairesSamedi || ''}
                      onChange={(e) => handleCellChange(site.id, 'horairesSamedi', e.target.value)}
                      className="inline-edit-input"
                      title="Horaires Samedi"
                      placeholder="HH:MM-HH:MM"
                      pattern="([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]"
                    />
                  ) : (
                    site.horairesSamedi || ''
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="text"
                      value={editingSites[site.id]?.codeBarres || site.codeBarres || ''}
                      onChange={(e) => handleCellChange(site.id, 'codeBarres', e.target.value)}
                      className="inline-edit-input"
                      title="Code-barre"
                    />
                  ) : (
                    site.codeBarres || ''
                  )}
                </td>
                <td>
                  {editMode ? (
                    site.latitude && site.longitude ? (
                      <span className="coordinates-display">
                        Lat: {site.latitude.toFixed(6)}<br/>
                        Lon: {site.longitude.toFixed(6)}
                      </span>
                    ) : (
                      <span className="coordinates-empty">
                        Pas de coordonnées<br/>
                        (utiliser le géocodage)
                      </span>
                    )
                  ) : (
                    site.latitude && site.longitude ? 
                    `Lat: ${site.latitude.toFixed(6)}, Lon: ${site.longitude.toFixed(6)}` : 
                    '-'
                  )}
                </td>
                <td>{site.id}</td>
                <td>
                  {editMode ? (
                    <select
                      value={editingSites[site.id]?.statut || site.statut || 'actif'}
                      onChange={(e) => handleCellChange(site.id, 'statut', e.target.value)}
                      className="inline-edit-select"
                      title="Statut du site"
                    >
                      <option value="actif">Actif</option>
                      <option value="inactif">Inactif</option>
                    </select>
                  ) : (
                    (site.statut === 'actif' || !site.statut) ? 'Actif' : 'Inactif'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Ajouter la pagination */}
        {renderPagination()}
      </div>
    </div>
  );
};

export default Sites;