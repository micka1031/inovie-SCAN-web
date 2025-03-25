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
  const handleAddSite = useCallback((site: Site) => {
    // Calculer l'heure d'arrivée par défaut
    let heureArrivee;
    
    if (tourSites.length === 0) {
      heureArrivee = new Date(heureDebut);
    } else {
      try {
        // Calculer un temps de trajet approximatif depuis le dernier site
        const lastSite = allSitesMap[tourSites[tourSites.length - 1].id.split('_')[0]];
        if (lastSite) {
          const estimatedTime = Math.round(mapService.estimateTravelTime(lastSite, site) / 60); // en minutes
          
          // Ajouter ce temps à l'heure d'arrivée du dernier site
          heureArrivee = new Date(tourSites[tourSites.length - 1].heureArrivee);
          heureArrivee.setMinutes(heureArrivee.getMinutes() + estimatedTime);
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
      site // Inclure les données complètes du site pour faciliter l'accès
    }]);
  }, [tourSites, heureDebut, allSitesMap]);

  // Optimiser l'ordre des sites
  const handleOptimizeTour = useCallback((newOrder: string[]) => {
    // Réorganiser les sites selon le nouvel ordre optimisé
    const optimizedSites = newOrder.map((siteId, index) => {
      const existingSite = tourSites.find(site => site.id === siteId);
      return {
        ...existingSite!,
        ordre: index + 1
      };
    });
    
    setTourSites(optimizedSites);
  }, [tourSites]);

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
