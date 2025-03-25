import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Alert, CircularProgress } from '@mui/material';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, doc, getDoc, query, where } from 'firebase/firestore';
import vehicleInspectionService from '../../services/vehicleInspectionService';

const DebugPermissions: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [collections, setCollections] = useState<string[]>([]);
  const [vehicleId, setVehicleId] = useState<string>('');

  useEffect(() => {
    // Afficher les informations d'authentification
    const auth = getAuth();
    console.log('Debug - Utilisateur Firebase:', auth.currentUser);
    console.log('Debug - Context Utilisateur:', currentUser);

    // Liste des collections à tester
    setCollections(['vehicules', 'documents', 'inspections', 'maintenance']);
  }, [currentUser]);

  const testCollection = async (collectionName: string) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      console.log(`Test de la collection '${collectionName}'...`);
      
      // Essayer de lire la collection
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      console.log(`Collection '${collectionName}' accessible`, snapshot.docs.length, 'documents trouvés');
      setResult(`Accès réussi à '${collectionName}': ${snapshot.docs.length} documents trouvés`);
    } catch (err: any) {
      console.error(`Erreur lors de l'accès à la collection '${collectionName}':`, err);
      setError(`Erreur d'accès à '${collectionName}': ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDocument = async (collectionName: string, documentId: string) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      console.log(`Test du document '${documentId}' dans la collection '${collectionName}'...`);
      
      // Essayer de lire le document
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log(`Document '${documentId}' accessible`, docSnap.data());
        setResult(`Accès réussi au document '${documentId}'`);
      } else {
        setResult(`Document '${documentId}' non trouvé`);
      }
    } catch (err: any) {
      console.error(`Erreur lors de l'accès au document '${documentId}':`, err);
      setError(`Erreur d'accès au document '${documentId}': ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testCreateDocument = async (collectionName: string) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      console.log(`Test de création dans la collection '${collectionName}'...`);
      
      // Essayer de créer un document
      const collectionRef = collection(db, collectionName);
      const docRef = await addDoc(collectionRef, {
        test: true,
        name: 'Test document',
        createdAt: new Date().toISOString()
      });
      
      console.log(`Document créé dans '${collectionName}' avec ID:`, docRef.id);
      setResult(`Document créé avec succès dans '${collectionName}': ${docRef.id}`);
    } catch (err: any) {
      console.error(`Erreur lors de la création dans '${collectionName}':`, err);
      setError(`Erreur de création dans '${collectionName}': ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testVehicleInspections = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      console.log('Test des inspections de véhicules...');
      
      // Utiliser la méthode de test du service
      const result = await vehicleInspectionService.testCollectionAccess();
      
      setResult(`Test des inspections terminé: ${result.message}`);
    } catch (err: any) {
      console.error('Erreur lors du test des inspections:', err);
      setError(`Erreur lors du test des inspections: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testSpecificVehicle = async () => {
    if (!vehicleId.trim()) {
      setError("Veuillez entrer un ID de véhicule");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      console.log(`Test du véhicule avec ID: ${vehicleId}`);
      
      // 1. Tester l'accès au document du véhicule
      try {
        const vehicleDocRef = doc(db, 'vehicules', vehicleId);
        const vehicleDoc = await getDoc(vehicleDocRef);
        
        if (vehicleDoc.exists()) {
          console.log('Document véhicule trouvé:', vehicleDoc.data());
          setResult(`Véhicule trouvé : ${JSON.stringify(vehicleDoc.data().immatriculation || 'Sans immatriculation')}`);
          
          // 2. Tester les inspections liées à ce véhicule
          try {
            // Tester dans la collection inspections
            const inspectionsRef = collection(db, 'inspections');
            const inspectionsQuery = query(inspectionsRef, where('vehicleId', '==', vehicleId));
            const inspectionsSnapshot = await getDocs(inspectionsQuery);
            
            console.log(`Inspections trouvées dans la collection 'inspections': ${inspectionsSnapshot.size}`);
            setResult(prev => `${prev}\nInspections trouvées: ${inspectionsSnapshot.size}`);
            
            // Tester dans l'ancienne collection vehicleInspections
            const oldInspectionsRef = collection(db, 'vehicleInspections');
            const oldInspectionsQuery = query(oldInspectionsRef, where('vehicleId', '==', vehicleId));
            const oldInspectionsSnapshot = await getDocs(oldInspectionsQuery);
            
            console.log(`Inspections trouvées dans la collection 'vehicleInspections': ${oldInspectionsSnapshot.size}`);
            setResult(prev => `${prev}\nAnciennes inspections trouvées: ${oldInspectionsSnapshot.size}`);
            
          } catch (inspErr: any) {
            console.error("Erreur lors de la recherche d'inspections:", inspErr);
            setError(`Erreur lors de la recherche d'inspections: ${inspErr.message}`);
          }
        } else {
          setError(`Aucun véhicule trouvé avec l'ID: ${vehicleId}`);
        }
      } catch (vehErr: any) {
        console.error("Erreur lors de l'accès au véhicule:", vehErr);
        setError(`Erreur lors de l'accès au véhicule: ${vehErr.message}`);
      }
      
    } catch (err: any) {
      console.error('Erreur lors du test spécifique:', err);
      setError(`Erreur lors du test spécifique: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showUserPermissions = () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      // Afficher les informations complètes sur l'utilisateur et ses permissions
      const permissions = currentUser?.permissions || [];
      const permissionsText = permissions.length > 0 
        ? permissions.join(', ') 
        : 'Aucune permission spécifique trouvée';
      
      // Vérifier des permissions spécifiques
      const vehiclesViewPermission = hasPermission('vehicules.view');
      const vehiclesEditPermission = hasPermission('vehicules.edit');
      const documentsViewPermission = hasPermission('documents.view');
      const inspectionsViewPermission = hasPermission('inspections.view');
      
      // Récupérer la liste des routes autorisées pour l'utilisateur
      const permissionDetails = `
        Role: ${currentUser?.role || 'Non défini'}
        Email: ${currentUser?.email || 'Non défini'}
        
        Permissions spécifiques:
        - vehicules.view: ${vehiclesViewPermission ? 'OUI' : 'NON'}
        - vehicules.edit: ${vehiclesEditPermission ? 'OUI' : 'NON'}
        - documents.view: ${documentsViewPermission ? 'OUI' : 'NON'}
        - inspections.view: ${inspectionsViewPermission ? 'OUI' : 'NON'}
        
        Liste des permissions: ${permissionsText}
      `;
      
      setResult(permissionDetails);
      
      // Log pour debug
      console.log('Détails des permissions de l\'utilisateur:', {
        role: currentUser?.role,
        permissions: permissions,
        vehiclesView: vehiclesViewPermission,
        vehiclesEdit: vehiclesEditPermission,
        documentsView: documentsViewPermission,
        inspectionsView: inspectionsViewPermission
      });
      
    } catch (err: any) {
      console.error('Erreur lors de l\'affichage des permissions:', err);
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Débogage des permissions Firebase</Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Informations d'utilisateur</Typography>
        <Typography>
          ID: {currentUser?.id || 'Non connecté'}
        </Typography>
        <Typography>
          Email: {currentUser?.email || 'Non connecté'}
        </Typography>
        <Typography>
          Rôle: {currentUser?.role || 'Non défini'}
        </Typography>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={showUserPermissions}
          sx={{ mt: 2 }}
        >
          Afficher les permissions détaillées
        </Button>
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Permissions</Typography>
        {collections.map(col => (
          <Typography key={col}>
            Permission {col}.view: {hasPermission(`${col}.view`) ? 'Oui' : 'Non'}
          </Typography>
        ))}
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Tester l'accès aux collections</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {collections.map(col => (
            <Button 
              key={col}
              variant="outlined" 
              onClick={() => testCollection(col)}
              disabled={loading}
            >
              Tester {col}
            </Button>
          ))}
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Button 
            variant="contained"
            color="secondary"
            onClick={testVehicleInspections}
            disabled={loading}
          >
            Test complet des inspections
          </Button>
        </Box>
        
        <Typography variant="h6" gutterBottom>Tester un véhicule spécifique</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <input
            type="text"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            placeholder="ID du véhicule"
            style={{ 
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              width: '250px'
            }}
          />
          <Button 
            variant="contained"
            color="primary"
            onClick={testSpecificVehicle}
            disabled={loading}
          >
            Tester ce véhicule
          </Button>
        </Box>
        
        <Typography variant="h6" gutterBottom>Tester la création</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {collections.map(col => (
            <Button 
              key={col}
              variant="contained" 
              color="primary"
              onClick={() => testCreateDocument(col)}
              disabled={loading}
            >
              Créer dans {col}
            </Button>
          ))}
        </Box>
      </Paper>
      
      {loading && <CircularProgress />}
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {result && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {result}
        </Alert>
      )}
    </Box>
  );
};

export default DebugPermissions; 