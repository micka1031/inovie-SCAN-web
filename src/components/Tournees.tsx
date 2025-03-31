import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Grid, Box, Paper, Typography, Button, Tabs, Tab } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import ConfigurationPanel from './Tournees/Configuration/ConfigurationPanel';
import SitesList from './Tournees/Configuration/SitesList';
import TourSites from './Tournees/Configuration/TourSites';
import MapView from './Tournees/Visualisation/MapView';
import TourStepsPanel from './Tournees/Visualisation/TourStepsPanel';
import TourneesList from './TourneesList';
import { tourneesService } from '../services/tourneesService';
import { mapService } from '../services/mapService';
import { Tournee, Site, SiteTournee } from '../types/tournees.types';
import './Tournees.css';
import { useAuth } from '../contexts/AuthContext';
import { usePoles } from '../services/PoleService';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

// Fonction utilitaire pour extraire l'ID original d'un site à partir d'un ID avec timestamp
const getOriginalSiteId = (uniqueId: string): string => {
  // L'ID original est avant le underscore, ou l'ID entier s'il n'y a pas d'underscore
  const parts = uniqueId.split('_');
  return parts[0];
};

const Tournees: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState<'liste' | 'configuration' | 'visualisation'>('liste');
  const [nom, setNom] = useState<string>('');
  const [pole, setPole] = useState<string>('');
  const [heureDebut, setHeureDebut] = useState<Date>(new Date());
  const [heureFin, setHeureFin] = useState<Date>(new Date(new Date().setHours(new Date().getHours() + 8)));
  const { poles, loading: polesLoading, error: polesError } = usePoles();
  const [sites, setSites] = useState<Site[]>([]);
  const [tourSites, setTourSites] = useState<SiteTournee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTourneeId, setSelectedTourneeId] = useState<string | null>(null);
  
  // Créer une map pour un accès facile aux données de site par ID
  const allSitesMap = useMemo(() => {
    const sitesMap: { [key: string]: Site } = {};
    sites.forEach(site => {
      sitesMap[site.id] = site;
    });
    return sitesMap;
  }, [sites]);

  // Charger les données initiales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Charger les sites
        const sitesData = await tourneesService.getSites();
        setSites(sitesData);
        
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setError("Impossible de charger les données des sites.");
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Charger les données d'une tournée existante
  const loadTournee = useCallback(async (tourneeId: string) => {
    try {
      setLoading(true);
      const tournee = await tourneesService.getTourneeById(tourneeId);
      
      // Mettre à jour l'état avec les données de la tournée
      setNom(tournee.nom);
      setPole(tournee.pole);
      setHeureDebut(new Date(tournee.heureDebut));
      setHeureFin(new Date(tournee.heureFin));
      
      // Convertir les sites de la tournée au format SiteTournee
      if (tournee.sites && tournee.sites.length > 0) {
        const sitesTournee = tournee.sites.map(site => {
          // Générer un ID unique pour permettre les sites dupliqués
          const uniqueId = `${site.id}_${Date.now() + Math.floor(Math.random() * 1000)}`;
          
          return {
            id: uniqueId,
            siteId: site.id,
            ordre: site.ordre,
            heureArrivee: new Date(site.heureArrivee),
            site: allSitesMap[site.id] // Associer les données du site
          };
        });
        
        // Trier par ordre
        sitesTournee.sort((a, b) => a.ordre - b.ordre);
        setTourSites(sitesTournee);
      }
      
      setSelectedTourneeId(tourneeId);
      setActiveTab('configuration');
      setLoading(false);
    } catch (error) {
      console.error(`Erreur lors du chargement de la tournée ${tourneeId}:`, error);
      setError(`Impossible de charger la tournée. Veuillez réessayer.`);
      setLoading(false);
    }
  }, [allSitesMap]);

  const handleViewTournee = useCallback((tourneeId: string) => {
    loadTournee(tourneeId).then(() => {
      setActiveTab('visualisation');
    });
  }, [loadTournee]);

  const handleEditTournee = useCallback((tourneeId: string) => {
    loadTournee(tourneeId);
  }, [loadTournee]);

  // Ajouter un site à la tournée (mémorisé)
  const handleAddSite = useCallback((site: Site, dureeArret: number = 5) => {
    // Calculer l'heure d'arrivée par défaut
    let heureArrivee;
    
    if (tourSites.length === 0) {
      heureArrivee = new Date(heureDebut);
    } else {
      try {
        // Récupérer le dernier site ajouté
        const lastSiteTournee = tourSites[tourSites.length - 1];
        const lastSite = allSitesMap[lastSiteTournee.siteId || lastSiteTournee.id.split('_')[0]];
        
        if (lastSite) {
          // Calculer le temps de trajet entre le dernier site et le nouveau site
          const travelTimePromise = mapService.estimateTravelTime(lastSite, site);
          
          // Utiliser une valeur par défaut ou le temps réel
          let travelTimeInSeconds = 300; // 5 minutes par défaut
          
          if (typeof travelTimePromise === 'number') {
            // Si c'est un nombre, l'utiliser directement
            travelTimeInSeconds = travelTimePromise;
          }
          
          const travelTimeInMinutes = Math.ceil(Number(travelTimeInSeconds) / 60);
          
          // Prendre l'heure d'arrivée du dernier site
          heureArrivee = new Date(lastSiteTournee.heureArrivee);
          
          // Ajouter la durée de visite du site précédent (utiliser la durée spécifique si définie, sinon 5 minutes par défaut)
          const lastSiteDuree = lastSiteTournee.dureeVisite !== undefined ? Number(lastSiteTournee.dureeVisite) : 5;
          heureArrivee.setMinutes(heureArrivee.getMinutes() + lastSiteDuree);
          
          // Ajouter le temps de trajet jusqu'au nouveau site
          heureArrivee.setMinutes(heureArrivee.getMinutes() + travelTimeInMinutes);
          
          console.log(`Calcul de l'heure d'arrivée à ${site.nom}: ${heureArrivee.toString()}`);
          console.log(`- Temps de trajet estimé: ${travelTimeInMinutes} minutes`);
          console.log(`- Durée de visite du site précédent: ${lastSiteDuree} minutes`);
        } else {
          heureArrivee = new Date(heureDebut);
        }
      } catch (err) {
        console.error('Erreur lors du calcul du temps de trajet:', err);
        heureArrivee = new Date(heureDebut);
      }
    }

    // Générer un identifiant unique en ajoutant un timestamp pour permettre des sites en double
    const uniqueId = `${site.id}_${Date.now()}`;

    // Ajouter le nouveau site à la liste
    setTourSites(prevSites => [...prevSites, {
      id: uniqueId,
      siteId: site.id, // Ajout du siteId original pour référence
      ordre: prevSites.length + 1,
      heureArrivee,
      dureeVisite: dureeArret, // Utiliser la durée d'arrêt spécifiée
      site // Inclure les données complètes du site pour faciliter l'accès
    }]);
  }, [tourSites, heureDebut, allSitesMap]);

  // Optimiser l'ordre des sites
  const handleOptimizeTour = useCallback(async (newOrder: string[]) => {
    if (tourSites.length === 0) return;
    
    console.log("Début de l'optimisation de la tournée avec le trafic réel...");
  
    // Stocker l'heure du premier site avant de modifier quoi que ce soit
    const originalFirstSiteDateString = tourSites[0].heureArrivee;
    const originalFirstSiteDate = new Date(originalFirstSiteDateString);
    
    console.log(`Heure originale du premier site: ${originalFirstSiteDate.toLocaleString()}`);
    
    try {
      // Préparer les données des sites pour l'optimisation
      const sitesForOptimization = await Promise.all(
        tourSites.map(async (site) => {
          const siteId = site.siteId || site.id.split('_')[0];
          return allSitesMap[siteId];
        })
      );
      
      // Appeler l'API d'optimisation avec l'heure de départ réelle
      console.log("Appel de l'API d'optimisation avec trafic réel...");
      const optimizationResult = await mapService.optimizeTour(
        sitesForOptimization.filter(Boolean),
        originalFirstSiteDate
      );
      
      console.log("Résultat de l'optimisation:", optimizationResult);
      
      if (!optimizationResult || !optimizationResult.sitesOrder || optimizationResult.sitesOrder.length === 0) {
        throw new Error("L'optimisation n'a pas retourné de résultat valide");
      }
      
      // Vérifier que les arrivalTimes sont présents dans la réponse
      if (!optimizationResult.arrivalTimes) {
        console.warn("Aucune heure d'arrivée n'a été retournée par l'optimisation. Recalcul local nécessaire.");
      } else {
        console.log("Heures d'arrivée obtenues de l'API:", optimizationResult.arrivalTimes);
      }
      
      // Réorganiser les sites selon le nouvel ordre optimisé
      let optimizedSites = optimizationResult.sitesOrder.map((siteId, index) => {
        // Trouver le site original dans la liste des sites actuels
        const originalSite = tourSites.find(site => {
          const originalId = site.siteId || site.id.split('_')[0];
          return originalId === siteId;
        });
        
        if (!originalSite) {
          console.error(`Site avec ID ${siteId} introuvable lors de l'optimisation`);
          return null;
        }
        
        // Utiliser l'heure d'arrivée estimée fournie par l'API si disponible
        let heureArrivee = originalSite.heureArrivee;
        
        if (optimizationResult.arrivalTimes && optimizationResult.arrivalTimes[siteId]) {
          heureArrivee = optimizationResult.arrivalTimes[siteId];
          console.log(`Heure d'arrivée à ${originalSite.site?.nom || siteId}: ${heureArrivee.toLocaleTimeString()}`);
        }
        
        return {
          ...originalSite,
          ordre: index + 1,
          heureArrivee: heureArrivee
        };
      }).filter(Boolean) as SiteTournee[];
      
      // Vérifier que nous avons bien tous les sites
      if (optimizedSites.length !== tourSites.length) {
        console.error(`Erreur d'optimisation: ${optimizedSites.length} sites récupérés sur ${tourSites.length}`);
        throw new Error("Des sites ont été perdus pendant l'optimisation");
      }
      
      // S'assurer que le premier site conserve son heure d'arrivée originale
      if (optimizedSites.length > 0) {
        optimizedSites[0] = {
          ...optimizedSites[0],
          heureArrivee: originalFirstSiteDate
        };
        
        // Si l'API n'a pas fourni d'heures d'arrivée, recalculer localement
        if (!optimizationResult.arrivalTimes) {
          console.log("Recalcul local des heures d'arrivée...");
          
          // Recalculer les heures d'arrivée pour les sites suivants
          let previousArrivalTime = originalFirstSiteDate;
          
          // Recalculer pour tous les sites à partir du deuxième
          for (let i = 1; i < optimizedSites.length; i++) {
            const currentSite = optimizedSites[i];
            const previousSite = optimizedSites[i-1];
            
            // Récupérer les détails des sites
            const previousSiteId = previousSite.siteId || previousSite.id.split('_')[0];
            const currentSiteId = currentSite.siteId || currentSite.id.split('_')[0];
            
            const previousSiteDetails = allSitesMap[previousSiteId];
            const currentSiteDetails = allSitesMap[currentSiteId];
            
            if (previousSiteDetails && currentSiteDetails) {
              // Calculer le temps de trajet avec l'heure de départ réelle
              const departureTime = new Date(previousArrivalTime);
              // Ajouter le temps de visite au site précédent
              const previousSiteDuree = previousSite.dureeVisite !== undefined ? Number(previousSite.dureeVisite) : 5;
              departureTime.setMinutes(departureTime.getMinutes() + previousSiteDuree);
              
              // Obtenir le temps de trajet réel avec le trafic à cette heure
              const travelTimeInSeconds = await mapService.estimateTravelTime(
                previousSiteDetails, 
                currentSiteDetails,
                departureTime
              );
              
              // Calculer la nouvelle heure d'arrivée
              const newArrivalTime = new Date(departureTime);
              newArrivalTime.setSeconds(newArrivalTime.getSeconds() + travelTimeInSeconds);
              
              // Mettre à jour l'heure d'arrivée
              optimizedSites[i] = {
                ...optimizedSites[i],
                heureArrivee: newArrivalTime
              };
              
              // Mettre à jour l'heure précédente pour le prochain calcul
              previousArrivalTime = newArrivalTime;
              
              console.log(`Recalcul local de l'heure d'arrivée pour ${currentSiteDetails.nom}: ${newArrivalTime.toLocaleTimeString()} (trajet: ${Math.round(travelTimeInSeconds/60)} min)`);
            }
          }
        }
      }
      
      // Vérifier que les heures sont définies correctement
      const hasInvalidDates = optimizedSites.some(site => {
        const date = new Date(site.heureArrivee);
        return isNaN(date.getTime());
      });
      
      if (hasInvalidDates) {
        console.error("Des heures d'arrivée invalides ont été détectées après l'optimisation");
        
        // Tenter de corriger les heures invalides
        optimizedSites = optimizedSites.map((site, index) => {
          const date = new Date(site.heureArrivee);
          if (isNaN(date.getTime())) {
            // Si l'heure est invalide, calculer une estimation basée sur l'index
            const estimatedTime = new Date(originalFirstSiteDate);
            estimatedTime.setMinutes(estimatedTime.getMinutes() + (index * 30)); // 30 minutes par site approximativement
            
            console.log(`Correction d'une heure invalide pour le site ${index + 1}: ${estimatedTime.toLocaleString()}`);
            
            return {
              ...site,
              heureArrivee: estimatedTime
            };
          }
          return site;
        });
      }
      
      // Mettre à jour les sites
      console.log("Optimisation terminée avec succès !");
      setTourSites(optimizedSites);
      
    } catch (error) {
      console.error("Erreur lors de l'optimisation:", error);
      enqueueSnackbar("Erreur lors de l'optimisation de la tournée", { variant: 'error' });
    }
  }, [tourSites, allSitesMap, enqueueSnackbar]);

  // Passer à l'étape suivante (visualisation)
  const handleNextStep = useCallback(() => {
    setActiveTab('visualisation');
  }, []);

  // Sauvegarder la tournée
  const handleSaveTour = useCallback(async () => {
    if (!currentUser || !selectedTourneeId) return;
    
    setLoading(true);
    
    try {
      // S'assurer que les heures sont correctement définies comme des objets Date
      const nowDate = new Date();
      const heureDebut = tourSites.length > 0 ? new Date(tourSites[0].heureArrivee) : nowDate;
      const heureFin = tourSites.length > 0 ? new Date(tourSites[tourSites.length - 1].heureArrivee) : nowDate;
      
      // Vérifier et assurer que les sites ont tous des heures d'arrivée valides
      const sitesWithValidTimes = tourSites.map(site => ({
        ...site,
        heureArrivee: site.heureArrivee ? new Date(site.heureArrivee) : nowDate
      }));
      
      const updatedTour: Partial<Tournee> = {
        nom,
        pole,
        heureDebut,
        heureFin,
        sites: sitesWithValidTimes.map(site => ({
          id: site.siteId || site.id.split('_')[0],
          ordre: site.ordre,
          heureArrivee: site.heureArrivee
        })),
        createdBy: currentUser.uid,
        createdAt: nowDate
      };
      
      let tourId;
      
      if (selectedTourneeId) {
        // Mise à jour d'une tournée existante
        await tourneesService.updateTournee(selectedTourneeId, updatedTour);
        tourId = selectedTourneeId;
        enqueueSnackbar('Tournée mise à jour avec succès', { variant: 'success' });
      } else {
        // Création d'une nouvelle tournée
        tourId = await tourneesService.createTournee(updatedTour as Omit<Tournee, 'id'>);
        enqueueSnackbar('Tournée créée avec succès', { variant: 'success' });
      }
      
      // Réinitialiser le formulaire et afficher la liste des tournées
      resetForm();
      setActiveTab('liste');
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la tournée:', error);
      setError("Impossible d'enregistrer la tournée. Veuillez réessayer.");
      enqueueSnackbar("Erreur lors de l'enregistrement de la tournée", { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [nom, pole, heureDebut, heureFin, tourSites, currentUser, selectedTourneeId, enqueueSnackbar]);

  // Sauvegarder la tournée sans changer d'onglet
  const handleSaveOnly = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    
    try {
      // S'assurer que les heures sont correctement définies comme des objets Date
      const nowDate = new Date();
      const heureDebut = tourSites.length > 0 ? new Date(tourSites[0].heureArrivee) : nowDate;
      const heureFin = tourSites.length > 0 ? new Date(tourSites[tourSites.length - 1].heureArrivee) : nowDate;
      
      // Vérifier et assurer que les sites ont tous des heures d'arrivée valides
      const sitesWithValidTimes = tourSites.map(site => ({
        ...site,
        heureArrivee: site.heureArrivee ? new Date(site.heureArrivee) : nowDate
      }));
      
      const updatedTour: Partial<Tournee> = {
        nom,
        pole,
        heureDebut,
        heureFin,
        sites: sitesWithValidTimes.map(site => ({
          id: site.siteId || site.id.split('_')[0],
          ordre: site.ordre,
          heureArrivee: site.heureArrivee
        })),
        createdBy: currentUser.uid,
        createdAt: nowDate
      };
      
      let tourId;
      
      if (selectedTourneeId) {
        // Mise à jour d'une tournée existante
        await tourneesService.updateTournee(selectedTourneeId, updatedTour);
        tourId = selectedTourneeId;
        enqueueSnackbar('Tournée mise à jour avec succès', { variant: 'success' });
      } else {
        // Création d'une nouvelle tournée
        tourId = await tourneesService.createTournee(updatedTour as Omit<Tournee, 'id'>);
        setSelectedTourneeId(tourId);
        enqueueSnackbar('Tournée créée avec succès', { variant: 'success' });
      }
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la tournée:', error);
      setError("Impossible d'enregistrer la tournée. Veuillez réessayer.");
      enqueueSnackbar("Erreur lors de l'enregistrement de la tournée", { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [nom, pole, heureDebut, heureFin, tourSites, currentUser, selectedTourneeId, enqueueSnackbar, tourneesService]);

  // Réinitialiser le formulaire pour une nouvelle tournée
  const resetForm = useCallback(() => {
    setNom('');
    setPole('');
    setHeureDebut(new Date());
    setHeureFin(new Date(new Date().setHours(new Date().getHours() + 8)));
    setTourSites([]);
    setSelectedTourneeId(null);
  }, []);

  // Créer une nouvelle tournée
  const handleNewTournee = useCallback(() => {
    resetForm();
    setActiveTab('configuration');
  }, [resetForm]);

  // Déterminer quels sites sont déjà sélectionnés (mémorisé)
  const selectedSitesIds = useMemo(() => {
    // Extraire les IDs originaux des sites (sans les timestamps)
    return new Set(tourSites.map(site => site.siteId || site.id.split('_')[0]));
  }, [tourSites]);

  // Changer d'onglet (mémorisé)
  const handleTabChange = useCallback((_, newValue: 'liste' | 'configuration' | 'visualisation') => {
    setActiveTab(newValue);
  }, []);

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Typography>Chargement des données...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ p: 2, bgcolor: '#fee', border: '1px solid #faa', borderRadius: 1 }}>
          <Typography color="error">{error}</Typography>
          <Button variant="outlined" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
            Réessayer
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" className="tournees-container">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Gestion des tournées
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleNewTournee}
        >
          Nouvelle tournée
        </Button>
      </Box>
      
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        sx={{ mb: 2 }}
      >
        <Tab label="Liste des tournées" value="liste" />
        <Tab label="Configuration" value="configuration" />
        <Tab 
          label="Visualisation" 
          value="visualisation" 
          disabled={tourSites.length < 2}
        />
      </Tabs>

      {activeTab === 'liste' && (
        <TourneesList 
          onEditTournee={handleEditTournee} 
          onViewTournee={handleViewTournee} 
          onNewTournee={handleNewTournee}
        />
      )}

      {activeTab === 'configuration' && (
        <Box>
          <ConfigurationPanel
            nom={nom}
            setNom={setNom}
            pole={pole}
            setPole={setPole}
            heureDebut={heureDebut}
            setHeureDebut={setHeureDebut}
            heureFin={heureFin}
            setHeureFin={setHeureFin}
            poles={poles}
            onNext={handleNextStep}
            onSave={handleSaveTour}
            onSaveOnly={handleSaveOnly}
          />
          
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={5}>
              <SitesList
                sites={sites}
                selectedSites={selectedSitesIds}
                onAddSite={handleAddSite}
              />
            </Grid>
            <Grid item xs={12} md={7}>
              <TourSites
                sites={tourSites}
                availableSites={sites}
                onSitesChange={setTourSites}
                onAddSite={() => {}}
                onBack={() => {}}
                onNext={handleNextStep}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {activeTab === 'visualisation' && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TourStepsPanel
              tourSites={tourSites}
              allSites={allSitesMap}
              onSitesReordered={setTourSites}
              onSave={handleSaveTour}
              onSaveOnly={handleSaveOnly}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <MapView
              sites={tourSites}
              allSites={allSitesMap}
              onOptimize={handleOptimizeTour}
            />
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default Tournees;
