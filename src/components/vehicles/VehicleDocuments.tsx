import React, { useState, useEffect } from 'react';
import { Vehicle, VehicleDocument } from '../../types/Vehicle';
import vehicleService from '../../services/vehicleService';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stack,
  Card,
  CardMedia,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocIcon,
} from '@mui/icons-material';

interface VehicleDocumentsProps {
  vehicle: Vehicle;
}

const VehicleDocuments: React.FC<VehicleDocumentsProps> = ({ vehicle }) => {
  const { hasPermission } = useAuth();
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<VehicleDocument | null>(null);
  const [formData, setFormData] = useState<Partial<VehicleDocument>>({
    title: '',
    type: 'insurance',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    notes: '',
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    loadDocuments();
  }, [vehicle.id]);
  
  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await vehicleService.getDocuments(vehicle.id);
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  const handleOpenDialog = (document?: VehicleDocument) => {
    if (document) {
      setSelectedDocument(document);
      setFormData({
        ...document,
        issueDate: formatDateForInput(document.issueDate),
        expiryDate: formatDateForInput(document.expiryDate),
      });
    } else {
      setSelectedDocument(null);
      setFormData({
        title: '',
        type: 'insurance',
        issueDate: formatDateForInput(new Date().toISOString()),
        expiryDate: '',
        notes: '',
      });
    }
    setShowDialog(true);
  };
  
  const handleCloseDialog = () => {
    setShowDialog(false);
    setSelectedDocument(null);
    setFormData({
      title: '',
      type: 'insurance',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      notes: '',
    });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setError('Aucun fichier sélectionné');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const auth = getAuth();
      if (!auth.currentUser) {
        setError('Vous devez être connecté pour télécharger des fichiers');
        return;
      }

      if (!hasPermission('documents.create')) {
        setError('Vous n\'avez pas les permissions nécessaires pour télécharger des fichiers');
        return;
      }

      // Traitement de chaque fichier
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Vérifications
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          setError(`Le fichier ${file.name} est trop volumineux. La taille maximale est de 5MB.`);
          continue;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          setError(`Type de fichier non autorisé pour ${file.name}. Seuls les fichiers JPG, PNG et PDF sont acceptés.`);
          continue;
        }

        try {
          await vehicleService.uploadDocument(vehicle.id, file);
        } catch (uploadErr: any) {
          setError(`Erreur lors de l'upload de ${file.name}: ${uploadErr.message}`);
        }
      }

      // Rafraîchir la liste après tous les uploads
      await loadDocuments();
      
    } catch (err: any) {
      setError(`Erreur: ${err.message || 'Une erreur inconnue s\'est produite'}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleSubmit = async () => {
    try {
      const submissionData = {
        ...formData,
        issueDate: new Date(formData.issueDate || '').toISOString(),
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : '',
      };

      if (selectedDocument) {
        await vehicleService.updateDocument(vehicle.id, selectedDocument.id, submissionData as VehicleDocument);
      } else {
        await vehicleService.addDocumentToVehicle(vehicle.id, submissionData as VehicleDocument);
      }
      handleCloseDialog();
      loadDocuments();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde du document');
      console.error('Erreur:', err);
    }
  };
  
  const handleDelete = async (documentId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      try {
        await vehicleService.deleteDocument(vehicle.id, documentId);
        loadDocuments();
      } catch (err: any) {
        setError(err.message || 'Erreur lors de la suppression du document');
        console.error('Erreur:', err);
      }
    }
  };
  
  const handlePreview = (document: VehicleDocument) => {
    setPreviewUrl(document.fileUrl);
    setShowPreview(true);
  };
  
  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'insurance':
        return <DescriptionIcon />;
      case 'registration':
        return <DescriptionIcon />;
      case 'inspection':
        return <DescriptionIcon />;
      case 'maintenance':
        return <DescriptionIcon />;
      case 'other':
        return <DescriptionIcon />;
      default:
        return <DescriptionIcon />;
    }
  };
  
  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'insurance':
        return 'Assurance';
      case 'registration':
        return 'Carte grise';
      case 'inspection':
        return 'Contrôle technique';
      case 'maintenance':
        return 'Maintenance';
      case 'other':
        return 'Autre';
      default:
        return type;
    }
  };
  
  const getExpiryStatus = (expiryDate: string) => {
    if (!expiryDate) return null;
    
    const dueDate = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { color: 'error', label: 'Expiré' };
    } else if (daysUntilExpiry <= 30) {
      return { color: 'warning', label: 'Expire bientôt' };
    } else {
      return { color: 'success', label: 'Valide' };
    }
  };
  
  const getFileIcon = (fileType: string) => {
    if (!fileType) {
      return <DocIcon />;
    }
    
    if (fileType.includes('pdf')) {
      return <PdfIcon />;
    } else if (fileType.includes('image')) {
      return <ImageIcon />;
    } else {
      return <DocIcon />;
    }
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Documents du véhicule</Typography>
        <Box>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            ref={fileInputRef}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || !hasPermission('documents.create')}
          >
            Ajouter des documents
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}
      
      {documents.length === 0 ? (
        <Alert severity="info">
          Aucun document pour ce véhicule. Utilisez le bouton "Ajouter des documents" pour ajouter un document.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Document</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Date d'émission</TableCell>
                <TableCell>Date d'expiration</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {getFileIcon(document.fileType)}
                      <Typography variant="body2">
                        {document.title || document.fileName}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {getDocumentTypeIcon(document.type)}
                      <Typography variant="body2">
                        {getDocumentTypeLabel(document.type)}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{document.issueDate ? new Date(document.issueDate).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    {document.expiryDate ? new Date(document.expiryDate).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    {document.expiryDate && (
                      <Chip 
                        label={getExpiryStatus(document.expiryDate)?.label}
                        color={getExpiryStatus(document.expiryDate)?.color as any}
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small"
                      onClick={() => handlePreview(document)}
                      title="Aperçu"
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small"
                      href={document.fileUrl}
                      target="_blank"
                      download
                      title="Télécharger"
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                    {hasPermission('documents.update') && (
                      <IconButton 
                        size="small"
                        onClick={() => handleOpenDialog(document)}
                        title="Éditer"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {hasPermission('documents.delete') && (
                      <IconButton 
                        size="small"
                        onClick={() => handleDelete(document.id)}
                        title="Supprimer"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Dialog d'ajout/modification */}
      <Dialog 
        open={showDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedDocument ? 'Modifier le document' : 'Nouveau document'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Titre"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                select
                SelectProps={{ native: true }}
              >
                <option value="insurance">Assurance</option>
                <option value="registration">Carte grise</option>
                <option value="inspection">Contrôle technique</option>
                <option value="maintenance">Maintenance</option>
                <option value="other">Autre</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date d'émission"
                type="date"
                name="issueDate"
                value={formData.issueDate}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date d'expiration"
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<AddIcon />}
              >
                Télécharger un fichier
                <input
                  type="file"
                  hidden
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </Button>
              {formData.fileName && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Fichier sélectionné: {formData.fileName}
                </Typography>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedDocument ? 'Modifier' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog de prévisualisation */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          Prévisualisation du document
        </DialogTitle>
        <DialogContent>
          {previewUrl && (
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                height: '70vh',
              }}
            >
              {previewUrl.includes('.pdf') ? (
                <iframe
                  src={previewUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Document preview"
                />
              ) : (
                <img 
                  src={previewUrl} 
                  alt="Document preview" 
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>
            Fermer
          </Button>
          {previewUrl && (
            <Button 
              href={previewUrl} 
              target="_blank" 
              download 
              variant="contained"
              startIcon={<DownloadIcon />}
            >
              Télécharger
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Résumé des documents */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Résumé des documents
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Documents expirés
              </Typography>
              <List dense>
                {documents
                  .filter(doc => doc.expiryDate && getExpiryStatus(doc.expiryDate)?.color === 'error')
                  .map(doc => (
                    <ListItem key={doc.id}>
                      <ListItemIcon>
                        <ErrorIcon color="error" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={doc.title}
                        secondary={`Expiré le ${new Date(doc.expiryDate).toLocaleDateString()}`}
                      />
                    </ListItem>
                  ))}
                
                {documents.filter(doc => doc.expiryDate && getExpiryStatus(doc.expiryDate)?.color === 'error').length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Aucun document expiré
                  </Typography>
                )}
              </List>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Documents à renouveler
              </Typography>
              <List dense>
                {documents
                  .filter(doc => doc.expiryDate && getExpiryStatus(doc.expiryDate)?.color === 'warning')
                  .map(doc => (
                    <ListItem key={doc.id}>
                      <ListItemIcon>
                        <WarningIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={doc.title}
                        secondary={`Expire le ${new Date(doc.expiryDate).toLocaleDateString()}`}
                      />
                    </ListItem>
                  ))}
                
                {documents.filter(doc => doc.expiryDate && getExpiryStatus(doc.expiryDate)?.color === 'warning').length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Aucun document à renouveler
                  </Typography>
                )}
              </List>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Documents valides
              </Typography>
              <List dense>
                {documents
                  .filter(doc => doc.expiryDate && getExpiryStatus(doc.expiryDate)?.color === 'success')
                  .map(doc => (
                    <ListItem key={doc.id}>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={doc.title}
                        secondary={`Expire le ${new Date(doc.expiryDate).toLocaleDateString()}`}
                      />
                    </ListItem>
                  ))}
                
                {documents.filter(doc => doc.expiryDate && getExpiryStatus(doc.expiryDate)?.color === 'success').length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Aucun document valide
                  </Typography>
                )}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default VehicleDocuments; 
