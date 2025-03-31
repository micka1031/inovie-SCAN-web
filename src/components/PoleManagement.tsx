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
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useSnackbar } from 'notistack';
import { SELAS } from '../types/SELAS';
import { SELASService } from '../services/SELASService';

interface Pole {
  id: string;
  nom: string;
  description?: string;
  dateCreation: string;
  dateModification: string;
  selasId?: string; // ID de la SELAS associée
}

const PoleManagement: React.FC = () => {
  const [poles, setPoles] = useState<Pole[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentPole, setCurrentPole] = useState<Pole | null>(null);
  const [newPoleName, setNewPoleName] = useState('');
  const [newPoleDescription, setNewPoleDescription] = useState('');
  const [newPoleSelasId, setNewPoleSelasId] = useState<string>('');
  const [usageCount, setUsageCount] = useState<Record<string, number>>({});
  const [selasList, setSelasList] = useState<SELAS[]>([]);
  const { enqueueSnackbar } = useSnackbar();
  const selasService = SELASService.getInstance();

  // Charger la liste des pôles au montage du composant
  useEffect(() => {
    fetchPoles();
    fetchSELAS();
  }, []);

  // Récupérer les pôles depuis Firestore
  const fetchPoles = async () => {
    try {
      setLoading(true);
      
      // Récupérer tous les pôles depuis la collection poles
      const polesRef = collection(db, 'poles');
      const snapshot = await getDocs(polesRef);
      
      const polesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Pole));
      
      setPoles(polesData);
      
      // Compter l'utilisation de chaque pôle
      await countPoleUsage(polesData);
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des pôles:', error);
      enqueueSnackbar('Erreur lors du chargement des pôles', { variant: 'error' });
      setLoading(false);
    }
  };

  // Récupérer la liste des SELAS depuis Firestore
  const fetchSELAS = async () => {
    try {
      const selasData = await selasService.getSELAS();
      // Filtrer pour n'afficher que les SELAS actives
      const activeSelas = selasData.filter(s => s.active);
      setSelasList(activeSelas);
    } catch (error) {
      console.error('Erreur lors du chargement des SELAS:', error);
      enqueueSnackbar('Erreur lors du chargement des SELAS', { variant: 'error' });
    }
  };

  // Obtenir le nom d'une SELAS à partir de son ID
  const getSelasName = (selasId?: string) => {
    if (!selasId) return '-';
    const selas = selasList.find(s => s.id === selasId);
    return selas ? selas.nom : '-';
  };

  // Compter combien de fois chaque pôle est utilisé
  const countPoleUsage = async (polesList: Pole[]) => {
    const usageCounts: Record<string, number> = {};
    
    // Initialiser les compteurs à 0
    polesList.forEach(pole => {
      usageCounts[pole.id] = 0;
    });

    // Collections à vérifier
    const collectionsToCheck = ['users', 'sites', 'passages', 'tournees', 'vehicules'];
    
    // Compter les utilisations dans chaque collection
    for (const collectionName of collectionsToCheck) {
      try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.pole) {
            // Trouver le pôle correspondant par son nom
            const matchingPole = polesList.find(p => p.nom === data.pole);
            if (matchingPole) {
              usageCounts[matchingPole.id]++;
            }
          }
        });
      } catch (error) {
        console.error(`Erreur lors du comptage des utilisations dans ${collectionName}:`, error);
      }
    }
    
    setUsageCount(usageCounts);
  };

  // Ajouter un nouveau pôle
  const addPole = async () => {
    if (!newPoleName.trim()) {
      enqueueSnackbar('Le nom du pôle est requis', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);
      
      // Vérifier si un pôle avec le même nom existe déjà
      const existingPole = poles.find(pole => 
        pole.nom.toLowerCase() === newPoleName.trim().toLowerCase()
      );
      
      if (existingPole) {
        enqueueSnackbar('Un pôle avec ce nom existe déjà', { variant: 'error' });
        setLoading(false);
        return;
      }
      
      // Créer le nouveau pôle
      const newPole = {
        nom: newPoleName.trim(),
        description: newPoleDescription.trim() || '',
        selasId: newPoleSelasId || undefined,
        dateCreation: new Date().toISOString(),
        dateModification: new Date().toISOString()
      };
      
      const polesRef = collection(db, 'poles');
      const docRef = await addDoc(polesRef, newPole);
      
      // Ajouter le nouveau pôle à la liste avec son ID
      setPoles([...poles, { ...newPole, id: docRef.id }]);
      
      enqueueSnackbar('Pôle ajouté avec succès', { variant: 'success' });
      
      // Réinitialiser le formulaire
      setNewPoleName('');
      setNewPoleDescription('');
      setNewPoleSelasId('');
      setOpenAddDialog(false);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du pôle:', error);
      enqueueSnackbar('Erreur lors de l\'ajout du pôle', { variant: 'error' });
      setLoading(false);
    }
  };

  // Mettre à jour un pôle existant
  const updatePole = async () => {
    if (!currentPole || !currentPole.nom.trim()) {
      enqueueSnackbar('Le nom du pôle est requis', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);
      
      // Vérifier si un autre pôle avec le même nom existe déjà
      const existingPole = poles.find(pole => 
        pole.nom.toLowerCase() === currentPole.nom.trim().toLowerCase() && 
        pole.id !== currentPole.id
      );
      
      if (existingPole) {
        enqueueSnackbar('Un pôle avec ce nom existe déjà', { variant: 'error' });
        setLoading(false);
        return;
      }
      
      // Mettre à jour le pôle
      const updatedPole = {
        ...currentPole,
        nom: currentPole.nom.trim(),
        description: currentPole.description?.trim() || '',
        selasId: currentPole.selasId === '' ? null : currentPole.selasId,
        dateModification: new Date().toISOString()
      };
      
      const poleRef = doc(db, 'poles', currentPole.id);
      await updateDoc(poleRef, updatedPole);
      
      // Mettre à jour la liste des pôles
      setPoles(poles.map(pole => 
        pole.id === currentPole.id ? updatedPole : pole
      ));
      
      enqueueSnackbar('Pôle mis à jour avec succès', { variant: 'success' });
      
      setOpenEditDialog(false);
      setCurrentPole(null);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du pôle:', error);
      enqueueSnackbar('Erreur lors de la mise à jour du pôle', { variant: 'error' });
      setLoading(false);
    }
  };

  // Supprimer un pôle
  const deletePole = async () => {
    if (!currentPole) return;

    try {
      setLoading(true);
      
      // Vérifier si le pôle est utilisé
      if (usageCount[currentPole.id] > 0) {
        enqueueSnackbar(
          `Ce pôle est utilisé par ${usageCount[currentPole.id]} éléments. Veuillez d'abord modifier ces éléments.`, 
          { variant: 'error' }
        );
        setLoading(false);
        setOpenDeleteDialog(false);
        return;
      }
      
      // Supprimer le pôle
      const poleRef = doc(db, 'poles', currentPole.id);
      await deleteDoc(poleRef);
      
      // Mettre à jour la liste des pôles
      setPoles(poles.filter(pole => pole.id !== currentPole.id));
      
      enqueueSnackbar('Pôle supprimé avec succès', { variant: 'success' });
      
      setOpenDeleteDialog(false);
      setCurrentPole(null);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la suppression du pôle:', error);
      enqueueSnackbar('Erreur lors de la suppression du pôle', { variant: 'error' });
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Gestion des pôles</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => setOpenAddDialog(true)}
        >
          Ajouter un pôle
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Les pôles permettent de regrouper et filtrer les données (sites, passages, tournées, véhicules) par zones géographiques ou organisationnelles.
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
                <TableCell>Nom du pôle</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>SELAS</TableCell>
                <TableCell>Date de création</TableCell>
                <TableCell>Utilisation</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {poles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body1" sx={{ py: 2 }}>
                      Aucun pôle n'a été créé. Cliquez sur "Ajouter un pôle" pour commencer.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                poles.map((pole) => (
                  <TableRow key={pole.id}>
                    <TableCell>{pole.nom}</TableCell>
                    <TableCell>{pole.description || '-'}</TableCell>
                    <TableCell>
                      {pole.selasId ? (
                        <Chip 
                          icon={<BusinessIcon fontSize="small" />}
                          label={getSelasName(pole.selasId)}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(pole.dateCreation).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${usageCount[pole.id] || 0} éléments`}
                        color={usageCount[pole.id] > 0 ? 'primary' : 'default'}
                        variant={usageCount[pole.id] > 0 ? 'filled' : 'outlined'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        color="primary" 
                        onClick={() => {
                          setCurrentPole(pole);
                          setOpenEditDialog(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error"
                        onClick={() => {
                          setCurrentPole(pole);
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

      {/* Dialog pour ajouter un pôle */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)}>
        <DialogTitle>Ajouter un nouveau pôle</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Entrez les informations du nouveau pôle. Le nom sera utilisé pour identifier le pôle dans l'application.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Nom du pôle"
            type="text"
            fullWidth
            variant="outlined"
            value={newPoleName}
            onChange={(e) => setNewPoleName(e.target.value)}
            required
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optionnelle)"
            type="text"
            fullWidth
            variant="outlined"
            value={newPoleDescription}
            onChange={(e) => setNewPoleDescription(e.target.value)}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel id="new-pole-selas-label">SELAS associée</InputLabel>
            <Select
              labelId="new-pole-selas-label"
              value={newPoleSelasId}
              onChange={(e) => setNewPoleSelasId(e.target.value)}
              label="SELAS associée"
            >
              <MenuItem value="">
                <em>Aucune</em>
              </MenuItem>
              {selasList.map((selas) => (
                <MenuItem key={selas.id} value={selas.id}>
                  {selas.nom}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)} color="inherit">
            Annuler
          </Button>
          <Button 
            onClick={addPole} 
            color="primary" 
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!newPoleName.trim() || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour modifier un pôle */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Modifier un pôle</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Modifiez les informations du pôle sélectionné.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Nom du pôle"
            type="text"
            fullWidth
            variant="outlined"
            value={currentPole?.nom || ''}
            onChange={(e) => setCurrentPole(currentPole ? {...currentPole, nom: e.target.value} : null)}
            required
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optionnelle)"
            type="text"
            fullWidth
            variant="outlined"
            value={currentPole?.description || ''}
            onChange={(e) => setCurrentPole(currentPole ? {...currentPole, description: e.target.value} : null)}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel id="edit-pole-selas-label">SELAS associée</InputLabel>
            <Select
              labelId="edit-pole-selas-label"
              value={currentPole?.selasId || ''}
              onChange={(e) => setCurrentPole(currentPole ? {...currentPole, selasId: e.target.value} : null)}
              label="SELAS associée"
            >
              <MenuItem value="">
                <em>Aucune</em>
              </MenuItem>
              {selasList.map((selas) => (
                <MenuItem key={selas.id} value={selas.id}>
                  {selas.nom}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} color="inherit">
            Annuler
          </Button>
          <Button 
            onClick={updatePole} 
            color="primary" 
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!currentPole?.nom.trim() || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour supprimer un pôle */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Supprimer un pôle</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer le pôle "{currentPole?.nom}" ?
            {usageCount[currentPole?.id || ''] > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Ce pôle est utilisé par {usageCount[currentPole?.id || '']} éléments. 
                Vous ne pouvez pas le supprimer tant qu'il est utilisé.
              </Alert>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="inherit">
            Annuler
          </Button>
          <Button 
            onClick={deletePole} 
            color="error" 
            variant="contained"
            startIcon={<DeleteIcon />}
            disabled={usageCount[currentPole?.id || ''] > 0 || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PoleManagement; 
