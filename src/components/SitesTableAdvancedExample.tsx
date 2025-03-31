import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { Site } from '../types';
import SitesTableAdvanced from './SitesTableAdvanced';
import { Alert, AlertTitle, Container, Paper, Typography } from '@mui/material';
import { geocodeSimpleAddress } from '../utils/geocoding';

const SitesTableAdvancedExample: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  // Chargement initial des sites
  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoading(true);
        const sitesCollection = collection(db, 'sites');
        const snapshot = await getDocs(sitesCollection);
        const sitesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Site));
        setSites(sitesData);
        setError(null);
      } catch (err) {
        console.error('Erreur lors du chargement des sites:', err);
        setError('Impossible de charger les sites. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, []);

  // Fonction pour sauvegarder les modifications des sites
  const handleSaveSites = async (
    updatedSites: Site[],
    newSites: Partial<Site>[],
    deletedSiteIds: string[]
  ): Promise<void> => {
    try {
      setSaveStatus({
        type: 'info',
        message: 'Sauvegarde en cours...'
      });

      // 1. Mettre à jour les sites existants
      const updatePromises = updatedSites.map(site => {
        const siteRef = doc(db, 'sites', site.id);
        // Enlever l'ID du site pour la mise à jour
        const { id, ...siteData } = site;
        return updateDoc(siteRef, siteData);
      });

      // 2. Ajouter les nouveaux sites
      const addPromises = newSites.map(site => {
        const { id, ...siteData } = site as Site;
        return addDoc(collection(db, 'sites'), siteData);
      });

      // 3. Supprimer les sites marqués pour suppression
      const deletePromises = deletedSiteIds.map(id => {
        const siteRef = doc(db, 'sites', id);
        return deleteDoc(siteRef);
      });

      // Exécuter toutes les opérations
      await Promise.all([
        ...updatePromises,
        ...addPromises,
        ...deletePromises
      ]);

      // Mettre à jour les sites localement
      const updatedSitesPromise = getDocs(collection(db, 'sites'));
      const updatedSitesSnapshot = await updatedSitesPromise;
      const updatedSitesData = updatedSitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Site));

      setSites(updatedSitesData);
      setSaveStatus({
        type: 'success',
        message: 'Modifications enregistrées avec succès!'
      });

      // Effacer le message après quelques secondes
      setTimeout(() => {
        setSaveStatus({ type: null, message: '' });
      }, 3000);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des sites:', error);
      setSaveStatus({
        type: 'error',
        message: `Erreur lors de la sauvegarde: ${error}`
      });
      throw error;
    }
  };

  // Fonction pour supprimer des sites
  const handleDeleteSites = async (siteIds: string[]) => {
    try {
      setSaveStatus({
        type: 'info',
        message: `Suppression de ${siteIds.length} site(s) en cours...`
      });

      const deletePromises = siteIds.map(id => {
        const siteRef = doc(db, 'sites', id);
        return deleteDoc(siteRef);
      });

      await Promise.all(deletePromises);

      // Mettre à jour les sites localement
      setSites(prevSites => prevSites.filter(site => !siteIds.includes(site.id)));

      setSaveStatus({
        type: 'success',
        message: `${siteIds.length} site(s) supprimé(s) avec succès!`
      });

      // Effacer le message après quelques secondes
      setTimeout(() => {
        setSaveStatus({ type: null, message: '' });
      }, 3000);
    } catch (error) {
      console.error('Erreur lors de la suppression des sites:', error);
      setSaveStatus({
        type: 'error',
        message: `Erreur lors de la suppression: ${error}`
      });
      throw error;
    }
  };

  // Fonction pour géocoder des sites
  const handleGeocodeAll = async (siteIds: string[]) => {
    try {
      setSaveStatus({
        type: 'info',
        message: `Géocodage de ${siteIds.length} site(s) en cours...`
      });

      let successCount = 0;
      let failCount = 0;

      // Pour chaque site, effectuer le géocodage
      for (const id of siteIds) {
        const site = sites.find(s => s.id === id);
        if (!site) continue;

        try {
          const address = `${site.adresse}, ${site.codePostal} ${site.ville}, France`;
          const result = await geocodeSimpleAddress(address);

          if (result.success) {
            // Mettre à jour dans Firestore
            const siteRef = doc(db, 'sites', id);
            await updateDoc(siteRef, {
              latitude: result.latitude,
              longitude: result.longitude
            });

            // Mettre à jour l'état local
            setSites(prevSites => prevSites.map(s => 
              s.id === id 
                ? { ...s, latitude: result.latitude, longitude: result.longitude } 
                : s
            ));

            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Erreur lors du géocodage du site ${id}:`, error);
          failCount++;
        }

        // Petite pause pour éviter de surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setSaveStatus({
        type: 'success',
        message: `Géocodage terminé: ${successCount} réussis, ${failCount} échecs`
      });

      // Effacer le message après quelques secondes
      setTimeout(() => {
        setSaveStatus({ type: null, message: '' });
      }, 5000);
    } catch (error) {
      console.error('Erreur lors du géocodage des sites:', error);
      setSaveStatus({
        type: 'error',
        message: `Erreur lors du géocodage: ${error}`
      });
    }
  };

  return (
    <Container maxWidth={false} sx={{ mt: 2, mb: 2, px: 2 }}>
      <Paper sx={{ p: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 0 }}>
            Gestion Avancée des Sites
          </Typography>
          <Link 
            to="/sites" 
            style={{ 
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              color: '#666',
              fontWeight: 500
            }}
          >
            <span className="material-icons" style={{ fontSize: '18px' }}>arrow_back</span>
            Retour à la vue standard
          </Link>
        </div>
        
        {saveStatus.type && (
          <Alert 
            severity={saveStatus.type} 
            sx={{ mb: 2 }}
            onClose={() => setSaveStatus({ type: null, message: '' })}
          >
            <AlertTitle>
              {saveStatus.type === 'success' ? 'Succès' : 
               saveStatus.type === 'error' ? 'Erreur' : 'Information'}
            </AlertTitle>
            {saveStatus.message}
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Erreur</AlertTitle>
            {error}
          </Alert>
        )}
        
        <div style={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
          <SitesTableAdvanced 
            sites={sites}
            onSave={handleSaveSites}
            onDelete={handleDeleteSites}
            onGeocodeAll={handleGeocodeAll}
            loading={loading}
          />
        </div>
      </Paper>
    </Container>
  );
};

export default SitesTableAdvancedExample; 