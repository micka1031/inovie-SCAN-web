import React, { useState, useEffect } from 'react';
import { Container, Grid, Box, Typography, Button, Tabs, Tab } from '@mui/material';
import ConfigurationPanel from '../components/Tournees/Configuration/ConfigurationPanel';
import SitesList from '../components/Tournees/Configuration/SitesList';
import TourSites from '../components/Tournees/Configuration/TourSites';
import MapView from '../components/Tournees/Visualisation/MapView';
import TourStepsPanel from '../components/Tournees/Visualisation/TourStepsPanel';
import { tourneesService } from '../services/tourneesService';
import { mapService } from '../services/mapService';
import { Tournee, Site, SiteTournee } from '../types/tournees.types';
import '../styles/TourneesManagement.css';

// Fonction utilitaire pour extraire l'ID original d'un site à partir d'un ID avec timestamp
const getOriginalSiteId = (uniqueId: string): string => {
  // L'ID original est avant le underscore, ou l'ID entier s'il n'y a pas d'underscore
  const parts = uniqueId.split('_');
  return parts[0];
};

// Wrapper pour la méthode de calcul synchrone
const estimateTravelTimeSync = (site1: Site, site2: Site): number => {
  const distance = mapService.calculateDistance(
    site1.latitude,
    site1.longitude,
    site2.latitude,
    site2.longitude
  );
  
  // Vitesse moyenne de 50 km/h
  const averageSpeed = 50;
  return (distance / averageSpeed) * 3600; // en secondes
};

const TourneesManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'configuration' | 'visualisation'>('configuration');
  const [nom, setNom] = useState<string>('');
  const [pole, setPole] = useState<string>('');
  const [heureDebut, setHeureDebut] = useState<Date>(new Date());
  const [heureFin, setHeureFin] = useState<Date>(new Date(new Date().setHours(new Date().getHours() + 8)));
  const [poles, setPoles] = useState<{ id: string; nom: string }[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [tourSites, setTourSites] = useState<SiteTournee[]>([]);
  const [allSitesMap, setAllSitesMap] = useState<{ [key: string]: Site }>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Charger les données initiales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Charger les sites
        const sitesData = await tourneesService.getSites();
        setSites(sitesData);

        // Créer une map pour un accès facile aux données de site par ID
        const sitesMap: { [key: string]: Site } = {};
        sitesData.forEach(site => {
          sitesMap[site.id] = site;
        });
        setAllSitesMap(sitesMap);
        
        // À adapter selon votre API réelle
        try {
          const polesData = await fetch('/api/poles').then(res => res.json());
          setPoles(polesData);
        } catch (error) {
          console.error("Erreur lors du chargement des pôles:", error);
          // Pôles par défaut si l'API n'est pas disponible
          setPoles([
            { id: "pole1", nom: "Pôle Nord" },
            { id: "pole2", nom: "Pôle Sud" },
            { id: "pole3", nom: "Pôle Est" }
          ]);
        }

        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Ajouter un site à la tournée
  const handleAddSite = (site: Site) => {
    // Éviter les doublons
    if (tourSites.some(ts => ts.id === site.id)) return;

    // Calculer l'heure d'arrivée par défaut
    let heureArrivee;
    
    if (tourSites.length === 0) {
      heureArrivee = new Date(heureDebut);
    } else {
      // Calculer un temps de trajet approximatif depuis le dernier site
      const lastSite = allSitesMap[tourSites[tourSites.length - 1].id];
      const estimatedTimeSeconds = mapService.estimateTravelTime(lastSite, site);
      const estimatedTimeMinutes = Math.round(estimatedTimeSeconds / 60);
      
      // Ajouter ce temps à l'heure d'arrivée du dernier site
      heureArrivee = new Date(tourSites[tourSites.length - 1].heureArrivee);
      heureArrivee.setMinutes(heureArrivee.getMinutes() + estimatedTimeMinutes);
    }

    // Ajouter le nouveau site à la liste
    const newTourSites = [...tourSites, {
      id: site.id,
      ordre: tourSites.length + 1,
      heureArrivee,
      site // Inclure les données complètes du site pour faciliter l'accès
    }];

    setTourSites(newTourSites);
  };

  // Supprimer un site de la tournée
  const handleRemoveSite = (index: number) => {
    const newTourSites = [...tourSites];
    newTourSites.splice(index, 1);
    
    // Mettre à jour l'ordre des sites restants
    const updatedTourSites = newTourSites.map((site, idx) => ({
      ...site,
      ordre: idx + 1
    }));
    
    setTourSites(updatedTourSites);
  };

  // Déplacer un site vers le haut dans la liste
  const handleMoveSiteUp = (index: number) => {
    if (index === 0) return;
    
    const newTourSites = [...tourSites];
    const temp = newTourSites[index];
    newTourSites[index] = newTourSites[index - 1];
    newTourSites[index - 1] = temp;
    
    // Mettre à jour l'ordre
    const updatedTourSites = newTourSites.map((site, idx) => ({
      ...site,
      ordre: idx + 1
    }));
    
    setTourSites(updatedTourSites);
  };

  // Déplacer un site vers le bas dans la liste
  const handleMoveSiteDown = (index: number) => {
    if (index === tourSites.length - 1) return;
    
    const newTourSites = [...tourSites];
    const temp = newTourSites[index];
    newTourSites[index] = newTourSites[index + 1];
    newTourSites[index + 1] = temp;
    
    // Mettre à jour l'ordre
    const updatedTourSites = newTourSites.map((site, idx) => ({
      ...site,
      ordre: idx + 1
    }));
    
    setTourSites(updatedTourSites);
  };

  // Modifier l'heure d'arrivée d'un site
  const handleTimeChange = (index: number, time: Date | null) => {
    if (!time) return;
    
    const newTourSites = [...tourSites];
    newTourSites[index] = {
      ...newTourSites[index],
      heureArrivee: time
    };
    
    setTourSites(newTourSites);
  };

  // Optimiser l'ordre des sites
  const handleOptimizeTour = async (newOrder: string[]) => {
    if (tourSites.length === 0) return;

    // Stocker l'heure du premier site avant de modifier quoi que ce soit
    const originalFirstSiteDateString = tourSites[0].heureArrivee;
    const originalFirstSiteDate = new Date(originalFirstSiteDateString);
    
    console.log(`Heure originale du premier site: ${originalFirstSiteDate.toLocaleString()}`);
    
    try {
      // Réorganiser les sites selon le nouvel ordre optimisé
      let optimizedSites = newOrder.map((siteId, index) => {
        const existingSite = tourSites.find(site => site.id === siteId);
        if (!existingSite) {
          console.error(`Site avec ID ${siteId} introuvable lors de l'optimisation`);
          return null;
        }
        return {
          ...existingSite,
          ordre: index + 1
        };
      }).filter(Boolean) as SiteTournee[];

      // Vérifier que nous avons bien tous les sites
      if (optimizedSites.length !== tourSites.length) {
        console.error(`Erreur d'optimisation: ${optimizedSites.length} sites récupérés sur ${tourSites.length}`);
        return;
      }

      // S'assurer que le premier site conserve son heure d'arrivée originale
      if (optimizedSites.length > 0) {
        optimizedSites[0] = {
          ...optimizedSites[0],
          heureArrivee: originalFirstSiteDate
        };
        
        // Recalculer les heures d'arrivée pour les sites suivants
        let previousArrivalTime = originalFirstSiteDate;
        
        // Recalculer pour tous les sites à partir du deuxième
        for (let i = 1; i < optimizedSites.length; i++) {
          const currentSite = optimizedSites[i];
          const previousSite = optimizedSites[i-1];
          
          // Récupérer les détails des sites
          const previousSiteId = previousSite.siteId || getOriginalSiteId(previousSite.id);
          const currentSiteId = currentSite.siteId || getOriginalSiteId(currentSite.id);
          
          const previousSiteDetails = allSitesMap[previousSiteId];
          const currentSiteDetails = allSitesMap[currentSiteId];
          
          if (previousSiteDetails && currentSiteDetails) {
            const travelTimeInSeconds = estimateTravelTimeSync(previousSiteDetails, currentSiteDetails);
            const travelTimeInMinutes = Math.ceil(Number(travelTimeInSeconds) / 60);
            
            // Calculer la nouvelle heure d'arrivée
            const newArrivalTime = new Date(previousArrivalTime);
            
            // Utiliser la durée spécifique du site précédent si définie, sinon 5 minutes par défaut
            const previousSiteDuree = previousSite.dureeVisite !== undefined ? Number(previousSite.dureeVisite) : 5;
            
            // Ajouter le temps de visite pour le site précédent
            newArrivalTime.setMinutes(newArrivalTime.getMinutes() + previousSiteDuree);
            
            // Ajouter le temps de trajet
            newArrivalTime.setMinutes(newArrivalTime.getMinutes() + travelTimeInMinutes);
            
            // Mettre à jour l'heure d'arrivée
            optimizedSites[i] = {
              ...optimizedSites[i],
              heureArrivee: newArrivalTime
            };
            
            // Mettre à jour l'heure précédente pour le prochain calcul
            previousArrivalTime = newArrivalTime;
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
      setTourSites(optimizedSites);
      
    } catch (error) {
      console.error('Erreur lors de l\'optimisation de la tournée:', error);
    }
  };

  // Passer à l'étape suivante (visualisation)
  const handleNextStep = () => {
    setActiveTab('visualisation');
  };

  // Sauvegarder la tournée
  const handleSaveTour = async () => {
    try {
      const tournee: Tournee = {
        nom,
        pole,
        heureDebut,
        heureFin,
        sites: tourSites.map(site => ({
          id: site.id,
          ordre: site.ordre,
          heureArrivee: site.heureArrivee
        }))
      };
      
      await tourneesService.createTournee(tournee);
      alert('Tournée sauvegardée avec succès !');
      // Rediriger ou réinitialiser le formulaire
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la tournée:', error);
      alert('Erreur lors de la sauvegarde de la tournée.');
    }
  };

  // Sauvegarder la tournée sans changer d'onglet
  const handleSaveOnly = async () => {
    try {
      const tournee: Tournee = {
        nom,
        pole,
        heureDebut,
        heureFin,
        sites: tourSites.map(site => ({
          id: site.id,
          ordre: site.ordre,
          heureArrivee: site.heureArrivee
        }))
      };
      
      await tourneesService.createTournee(tournee);
      alert('Tournée sauvegardée avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la tournée:', error);
      alert('Erreur lors de la sauvegarde de la tournée.');
    }
  };

  // Déterminer quels sites sont déjà sélectionnés
  const selectedSitesIds = new Set(tourSites.map(site => site.id));

  return (
    <Container maxWidth="xl" className="tournees-management-container">
      <Typography variant="h4" component="h1" gutterBottom>
        Gestion des tournées
      </Typography>
      
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        sx={{ mb: 2 }}
      >
        <Tab label="Configuration" value="configuration" />
        <Tab label="Visualisation" value="visualisation" disabled={tourSites.length < 2} />
      </Tabs>

      {activeTab === 'configuration' ? (
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
                availableSites={Object.values(allSitesMap)}
                onSitesChange={setTourSites}
                onAddSite={() => {}}
                onBack={() => {}}
                onNext={handleNextStep}
              />
            </Grid>
          </Grid>
        </Box>
      ) : (
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

export default TourneesManagement; 