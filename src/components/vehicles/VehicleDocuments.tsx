import React, { useState, useEffect } from 'react';
import { Vehicle, VehicleDocument } from '../../types/Vehicle';
import { vehicleService } from '../../services/vehicleService';
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
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenDialog = (document?: VehicleDocument) => {
    if (document) {
      setSelectedDocument(document);
      setFormData(document);
    } else {
      setSelectedDocument(null);
      setFormData({
        title: '',
        type: 'insurance',
        issueDate: new Date().toISOString().split('T')[0],
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
    const file = e.target.files?.[0];
    if (file) {
      try {
        const uploadedDoc = await vehicleService.uploadDocument(vehicle.id, file);
        setFormData(prev => ({
          ...prev,
          fileUrl: uploadedDoc.fileUrl,
          fileName: file.name,
          fileType: file.type,
        }));
      } catch (err: any) {
        setError(err.message || 'Erreur lors du téléchargement du fichier');
        console.error('Erreur:', err);
      }
    }
  };
  
  const handleSubmit = async () => {
    try {
      if (selectedDocument) {
        await vehicleService.updateDocument(vehicle.id, selectedDocument.id, formData as VehicleDocument);
      } else {
        await vehicleService.addDocumentToVehicle(vehicle.id, formData as VehicleDocument);
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
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nouveau document
        </Button>
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
          Aucun document pour ce véhicule. Utilisez le bouton "Nouveau document" pour ajouter un document.
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
                        {document.title}
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
                  <TableCell>{new Date(document.issueDate).toLocaleDateString()}</TableCell>
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
                    <IconButton 
                      size="small"
                      onClick={() => handleOpenDialog(document)}
                      title="Éditer"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small"
                      onClick={() => handleDelete(document.id)}
                      title="Supprimer"
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
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
