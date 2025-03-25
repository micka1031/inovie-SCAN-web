import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  DirectionsCar as CarIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useSnackbar } from 'notistack';
import { Vehicule } from '../types/index';
import PoleSelector from './PoleSelector';
import { usePoles, Pole } from '../services/PoleService';

interface VehiculeFormData {
  immatriculation: string;
  marque: string;
  modele: string;
  annee?: number;
  type?: string;
  pole?: string;
  statut?: string;
}

const VEHICULE_TYPES = ['Utilitaire', 'Berline', 'SUV', 'Camionnette', 'Autre'];
const VEHICULE_STATUTS = ['Actif', 'En maintenance', 'Inactif'];

// Mapping entre statuts affichés et valeurs en base de données
const mapStatutToDBValue = (statut: string): 'actif' | 'maintenance' | 'inactif' => {
  switch (statut) {
    case 'Actif': return 'actif';
    case 'En maintenance': return 'maintenance';
    case 'Inactif': return 'inactif';
    default: return 'actif';
  }
};

const FleetManagement: React.FC = () => {
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentVehicule, setCurrentVehicule] = useState<Vehicule | null>(null);
  const [newVehicule, setNewVehicule] = useState<VehiculeFormData>({
    immatriculation: '',
    marque: '',
    modele: '',
    annee: undefined,
    type: '',
    pole: '',
    statut: 'Actif'
  });
  const { enqueueSnackbar } = useSnackbar();
  const { poles } = usePoles(); // Utiliser le hook usePoles pour récupérer les pôles

  // Charger la liste des véhicules au montage du composant
  useEffect(() => {
    fetchVehicules();
  }, []);

  // Récupérer les véhicules depuis Firestore
  const fetchVehicules = async () => {
    try {
      setLoading(true);
      
      // Récupérer tous les véhicules depuis la collection vehicules
      const vehiculesRef = collection(db, 'vehicules');
      const snapshot = await getDocs(vehiculesRef);
      
      const vehiculesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Vehicule));
      
      setVehicules(vehiculesData);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des véhicules:', error);
      enqueueSnackbar('Erreur lors du chargement des véhicules', { variant: 'error' });
      setLoading(false);
    }
  };

  // Fonction pour obtenir le nom du pôle à partir de son ID
  const getPoleNameById = (poleId: string | undefined): string => {
    if (!poleId) return '-';
    const pole = poles.find(p => p.id === poleId);
    return pole ? pole.nom : poleId;
  };

  // Fonction pour gérer les changements dans l'ajout de véhicule
  const handleNewVehiculeChange = (field: keyof VehiculeFormData, value: string) => {
    if (field === 'annee') {
      setNewVehicule({
        ...newVehicule,
        [field]: value ? Number(value) : undefined
      });
    } else {
      setNewVehicule({
        ...newVehicule,
        [field]: value
      });
    }
  };

  // Ajouter un nouveau véhicule
  const addVehicule = async () => {
    if (!newVehicule.immatriculation.trim() || !newVehicule.marque.trim() || !newVehicule.modele.trim()) {
      enqueueSnackbar('Tous les champs obligatoires doivent être remplis', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);
      
      // Vérifier si un véhicule avec la même immatriculation existe déjà
      const existingVehicule = vehicules.find(v => 
        v.immatriculation.toLowerCase() === newVehicule.immatriculation.trim().toLowerCase()
      );
      
      if (existingVehicule) {
        enqueueSnackbar('Un véhicule avec cette immatriculation existe déjà', { variant: 'error' });
        setLoading(false);
        return;
      }
      
      // Créer le nouveau véhicule avec conversion des types
      const newVehiculeWithCorrectTypes: Omit<Vehicule, 'id'> = {
        immatriculation: newVehicule.immatriculation.trim().toUpperCase(),
        marque: newVehicule.marque.trim(),
        modele: newVehicule.modele.trim(),
        annee: newVehicule.annee || 0,
        type: newVehicule.type || '',
        statut: (newVehicule.statut || 'actif') as 'actif' | 'maintenance' | 'inactif',
        pole: newVehicule.pole,
        kilometrage: 0,
        dateCreation: new Date().toISOString(),
        dateModification: new Date().toISOString()
      };
      
      const vehiculesRef = collection(db, 'vehicules');
      const docRef = await addDoc(vehiculesRef, newVehiculeWithCorrectTypes);
      
      // Ajouter le nouveau véhicule à la liste avec son ID
      setVehicules([...vehicules, { ...newVehiculeWithCorrectTypes, id: docRef.id }]);
      
      enqueueSnackbar('Véhicule ajouté avec succès', { variant: 'success' });
      
      // Réinitialiser le formulaire
      setNewVehicule({
        immatriculation: '',
        marque: '',
        modele: '',
        annee: undefined,
        type: '',
        pole: '',
        statut: 'Actif'
      });
      setOpenAddDialog(false);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du véhicule:', error);
      enqueueSnackbar('Erreur lors de l\'ajout du véhicule', { variant: 'error' });
      setLoading(false);
    }
  };

  // Mettre à jour un véhicule existant
  const updateVehicule = async () => {
    if (!currentVehicule) return;
    
    if (!currentVehicule.immatriculation.trim() || !currentVehicule.marque.trim() || !currentVehicule.modele.trim()) {
      enqueueSnackbar('Tous les champs obligatoires doivent être remplis', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);
      
      // Vérifier si un autre véhicule avec la même immatriculation existe déjà
      const existingVehicule = vehicules.find(v => 
        v.immatriculation.toLowerCase() === currentVehicule.immatriculation.trim().toLowerCase() && 
        v.id !== currentVehicule.id
      );
      
      if (existingVehicule) {
        enqueueSnackbar('Un véhicule avec cette immatriculation existe déjà', { variant: 'error' });
        setLoading(false);
        return;
      }
      
      // Mettre à jour le véhicule
      const updatedVehicule = {
        ...currentVehicule,
        immatriculation: currentVehicule.immatriculation.trim().toUpperCase(),
        marque: currentVehicule.marque.trim(),
        modele: currentVehicule.modele.trim(),
        dateModification: new Date().toISOString()
      };
      
      const vehiculeRef = doc(db, 'vehicules', currentVehicule.id);
      await updateDoc(vehiculeRef, updatedVehicule);
      
      // Mettre à jour la liste des véhicules
      setVehicules(vehicules.map(v => 
        v.id === currentVehicule.id ? updatedVehicule : v
      ));
      
      enqueueSnackbar('Véhicule mis à jour avec succès', { variant: 'success' });
      
      setOpenEditDialog(false);
      setCurrentVehicule(null);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du véhicule:', error);
      enqueueSnackbar('Erreur lors de la mise à jour du véhicule', { variant: 'error' });
      setLoading(false);
    }
  };

  // Supprimer un véhicule
  const deleteVehicule = async () => {
    if (!currentVehicule) return;

    try {
      setLoading(true);
      
      // Vérifier si le véhicule est utilisé dans des tournées
      const tourneesRef = collection(db, 'tournees');
      const tourneesQuery = query(tourneesRef, where('vehiculeId', '==', currentVehicule.id));
      const tourneesSnapshot = await getDocs(tourneesQuery);
      
      if (!tourneesSnapshot.empty) {
        enqueueSnackbar(
          `Ce véhicule est utilisé dans ${tourneesSnapshot.size} tournée(s). Veuillez d'abord modifier ces tournées.`, 
          { variant: 'error' }
        );
        setLoading(false);
        setOpenDeleteDialog(false);
        return;
      }
      
      // Supprimer le véhicule
      const vehiculeRef = doc(db, 'vehicules', currentVehicule.id);
      await deleteDoc(vehiculeRef);
      
      // Mettre à jour la liste des véhicules
      setVehicules(vehicules.filter(v => v.id !== currentVehicule.id));
      
      enqueueSnackbar('Véhicule supprimé avec succès', { variant: 'success' });
      
      setOpenDeleteDialog(false);
      setCurrentVehicule(null);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la suppression du véhicule:', error);
      enqueueSnackbar('Erreur lors de la suppression du véhicule', { variant: 'error' });
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Gestion de la flotte</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => setOpenAddDialog(true)}
        >
          Ajouter un véhicule
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Gérez la flotte de véhicules utilisés pour les tournées. Vous pouvez ajouter, modifier et supprimer des véhicules.
      </Alert>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Immatriculation</TableCell>
                <TableCell>Marque</TableCell>
                <TableCell>Modèle</TableCell>
                <TableCell>Année</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Pôle</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vehicules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body1" sx={{ py: 2 }}>
                      Aucun véhicule n'a été ajouté. Cliquez sur "Ajouter un véhicule" pour commencer.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                vehicules.map((vehicule) => (
                  <TableRow key={vehicule.id}>
                    <TableCell>{vehicule.immatriculation}</TableCell>
                    <TableCell>{vehicule.marque}</TableCell>
                    <TableCell>{vehicule.modele}</TableCell>
                    <TableCell>{vehicule.annee || '-'}</TableCell>
                    <TableCell>{vehicule.type || '-'}</TableCell>
                    <TableCell>{getPoleNameById(vehicule.pole)}</TableCell>
                    <TableCell>{vehicule.statut || 'Actif'}</TableCell>
                    <TableCell align="right">
                      <IconButton 
                        color="primary" 
                        onClick={() => {
                          setCurrentVehicule(vehicule);
                          setOpenEditDialog(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error"
                        onClick={() => {
                          setCurrentVehicule(vehicule);
                          setOpenDeleteDialog(true);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog pour ajouter un véhicule */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter un nouveau véhicule</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Entrez les informations du nouveau véhicule. Les champs marqués d'un astérisque (*) sont obligatoires.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Immatriculation *"
            type="text"
            fullWidth
            variant="outlined"
            value={newVehicule.immatriculation}
            onChange={(e) => handleNewVehiculeChange('immatriculation', e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Marque *"
            type="text"
            fullWidth
            variant="outlined"
            value={newVehicule.marque}
            onChange={(e) => handleNewVehiculeChange('marque', e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Modèle *"
            type="text"
            fullWidth
            variant="outlined"
            value={newVehicule.modele}
            onChange={(e) => handleNewVehiculeChange('modele', e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Année"
            type="text"
            fullWidth
            variant="outlined"
            value={newVehicule.annee?.toString() || ''}
            onChange={(e) => handleNewVehiculeChange('annee', e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel id="vehicule-type-label">Type de véhicule</InputLabel>
            <Select
              labelId="vehicule-type-label"
              value={newVehicule.type || ''}
              label="Type de véhicule"
              onChange={(e: SelectChangeEvent) => handleNewVehiculeChange('type', e.target.value)}
            >
              <MenuItem value="">
                <em>Non spécifié</em>
              </MenuItem>
              {VEHICULE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <PoleSelector
              value={newVehicule.pole || ''}
              onChange={(value) => handleNewVehiculeChange('pole', value)}
              placeholder="Sélectionner un pôle"
              style={{ width: '100%' }}
              showSearch
              allowClear
            />
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel id="vehicule-statut-label">Statut</InputLabel>
            <Select
              labelId="vehicule-statut-label"
              value={newVehicule.statut || 'Actif'}
              label="Statut"
              onChange={(e: SelectChangeEvent) => handleNewVehiculeChange('statut', e.target.value)}
            >
              {VEHICULE_STATUTS.map((statut) => (
                <MenuItem key={statut} value={statut}>{statut}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)} color="inherit">
            Annuler
          </Button>
          <Button 
            onClick={addVehicule} 
            color="primary" 
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!newVehicule.immatriculation.trim() || !newVehicule.marque.trim() || !newVehicule.modele.trim() || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour modifier un véhicule */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier un véhicule</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Modifiez les informations du véhicule. Les champs marqués d'un astérisque (*) sont obligatoires.
          </DialogContentText>
          {currentVehicule && (
            <>
              <TextField
                autoFocus
                margin="dense"
                label="Immatriculation *"
                type="text"
                fullWidth
                variant="outlined"
                value={currentVehicule.immatriculation}
                onChange={(e) => setCurrentVehicule({...currentVehicule, immatriculation: e.target.value})}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Marque *"
                type="text"
                fullWidth
                variant="outlined"
                value={currentVehicule.marque}
                onChange={(e) => setCurrentVehicule({...currentVehicule, marque: e.target.value})}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Modèle *"
                type="text"
                fullWidth
                variant="outlined"
                value={currentVehicule.modele}
                onChange={(e) => setCurrentVehicule({...currentVehicule, modele: e.target.value})}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Année"
                type="text"
                fullWidth
                variant="outlined"
                value={currentVehicule.annee?.toString() || ''}
                onChange={(e) => setCurrentVehicule({...currentVehicule, annee: e.target.value ? Number(e.target.value) : undefined})}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
                <InputLabel id="edit-vehicule-type-label">Type de véhicule</InputLabel>
                <Select
                  labelId="edit-vehicule-type-label"
                  value={currentVehicule.type || ''}
                  label="Type de véhicule"
                  onChange={(e: SelectChangeEvent) => setCurrentVehicule({...currentVehicule, type: e.target.value})}
                >
                  <MenuItem value="">
                    <em>Non spécifié</em>
                  </MenuItem>
                  {VEHICULE_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
                <PoleSelector
                  value={currentVehicule.pole || ''}
                  onChange={(value) => setCurrentVehicule({...currentVehicule, pole: value})}
                  placeholder="Sélectionner un pôle"
                  style={{ width: '100%' }}
                  showSearch
                  allowClear
                />
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel id="edit-vehicule-statut-label">Statut</InputLabel>
                <Select
                  labelId="edit-vehicule-statut-label"
                  value={currentVehicule.statut || 'actif'}
                  label="Statut"
                  onChange={(e: SelectChangeEvent) => setCurrentVehicule({
                    ...currentVehicule, 
                    statut: mapStatutToDBValue(e.target.value)
                  })}
                >
                  {VEHICULE_STATUTS.map((statut) => (
                    <MenuItem key={statut} value={statut}>{statut}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} color="inherit">
            Annuler
          </Button>
          <Button 
            onClick={updateVehicule} 
            color="primary" 
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!currentVehicule?.immatriculation.trim() || !currentVehicule?.marque.trim() || !currentVehicule?.modele.trim() || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour supprimer un véhicule */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Supprimer un véhicule</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer le véhicule "{currentVehicule?.immatriculation}" ({currentVehicule?.marque} {currentVehicule?.modele}) ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="inherit">
            Annuler
          </Button>
          <Button 
            onClick={deleteVehicule} 
            color="error" 
            variant="contained"
            startIcon={<DeleteIcon />}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FleetManagement; 
