import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Divider,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Sync as SyncIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Backup as BackupIcon,
  Storage as StorageIcon,
  Dashboard as DashboardIcon,
  BugReport as BugReportIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Build as BuildIcon,
  SaveAlt as SaveAltIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Map as MapIcon,
  Business as BusinessIcon,
  MedicalServices as MedicalServicesIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import SharePointSync from './SharePointSync';
import RoleManagement from './RoleManagement';
import MarkerPreferences from './MarkerPreferences';
import SELASManagement from './SELASManagement';
import PoleManagement from './PoleManagement';
import { useAuth } from '../contexts/AuthContext';
import { AdminService } from '../services/AdminService';
import { useSnackbar } from 'notistack';

// Interface pour les propriétés de l'onglet
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Composant pour afficher le contenu d'un onglet
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Fonction pour générer les propriétés d'accessibilité des onglets
const a11yProps = (index: number) => {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
};

/**
 * Composant principal du panneau d'administration
 * Intègre différentes fonctionnalités d'administration, dont la synchronisation SharePoint
 */
const AdminPanel: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const { currentUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const adminService = new AdminService();
  
  // États pour les fonctionnalités
  const [collectionsStats, setCollectionsStats] = useState<Record<string, number>>({});
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  
  // Détecter le paramètre tab dans l'URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam !== null) {
      const tabIndex = parseInt(tabParam, 10);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 7) {
        setTabValue(tabIndex);
      }
    }
  }, [location]);
  
  // Charger les statistiques au montage
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const stats = await adminService.getCollectionsStats();
        setCollectionsStats(stats);
      } catch (error) {
        enqueueSnackbar('Erreur lors du chargement des statistiques', { variant: 'error' });
      }
    };

    loadInitialData();
  }, []);
  
  // Vérifier si l'utilisateur est administrateur
  const isAdmin = currentUser?.role === 'Administrateur';
  
  // Gérer le changement d'onglet
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Mettre à jour l'URL avec le nouvel onglet
    navigate(`/admin?tab=${newValue}`, { replace: true });
  };
  
  // Si l'utilisateur n'est pas administrateur, afficher un message d'erreur
  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">Accès refusé</Typography>
          <Typography variant="body1">
            Vous n'avez pas les droits nécessaires pour accéder au panneau d'administration.
            Seuls les utilisateurs avec le rôle "Administrateur" peuvent y accéder.
          </Typography>
        </Alert>
      </Container>
    );
  }
  
  // Gestionnaires d'événements pour les boutons
  const handleCreateFullBackup = async () => {
    try {
      await adminService.createFullBackup();
      enqueueSnackbar('Sauvegarde complète créée avec succès', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de la création de la sauvegarde', { variant: 'error' });
    }
  };

  const handleCreateSelectiveBackup = async () => {
    try {
      await adminService.createSelectiveBackup(['users', 'passages', 'sites', 'tournees']);
      enqueueSnackbar('Sauvegarde sélective créée avec succès', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de la création de la sauvegarde sélective', { variant: 'error' });
    }
  };

  const handleCleanupData = async () => {
    try {
      const date = new Date();
      date.setMonth(date.getMonth() - 6); // Nettoyer les données de plus de 6 mois
      await adminService.cleanupObsoleteData('passages', date);
      enqueueSnackbar('Nettoyage des données effectué avec succès', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erreur lors du nettoyage des données', { variant: 'error' });
    }
  };

  const handleOptimizeIndexes = async () => {
    try {
      await adminService.optimizeIndexes();
      enqueueSnackbar('Optimisation des index effectuée avec succès', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de l\'optimisation des index', { variant: 'error' });
    }
  };

  const handleExportLogs = async () => {
    try {
      await adminService.exportErrorLogs();
      enqueueSnackbar('Logs exportés avec succès', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de l\'exportation des logs', { variant: 'error' });
    }
  };

  const handleRunDiagnostic = async () => {
    try {
      const result = await adminService.runFullDiagnostic();
      setDiagnosticResult(result);
      enqueueSnackbar('Diagnostic système effectué avec succès', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erreur lors du diagnostic', { variant: 'error' });
    }
  };

  // Gestionnaires de fonctions supplémentaires
  const handleViewAllLogs = async () => {
    try {
      const logs = await adminService.getErrorLogs();
      console.log('Logs:', logs);
      enqueueSnackbar('Journaux récupérés avec succès', { variant: 'info' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de la récupération des journaux', { variant: 'error' });
    }
  };

  const handleRestoreBackup = async () => {
    try {
      enqueueSnackbar('Restauration de sauvegarde en cours de développement', { variant: 'warning' });
      setOpenRestoreDialog(false);
    } catch (error) {
      enqueueSnackbar('Erreur lors de la restauration', { variant: 'error' });
    }
  };

  const handleImportExternalBackup = async () => {
    try {
      enqueueSnackbar('Import de sauvegarde externe en cours de développement', { variant: 'warning' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de l\'import', { variant: 'error' });
    }
  };

  const handleOpenResetDialog = () => {
    setOpenResetDialog(true);
  };

  const handleCloseResetDialog = () => {
    setOpenResetDialog(false);
    setResetConfirmation('');
  };

  const handleConfirmReset = async () => {
    try {
      await adminService.resetDatabase(resetConfirmation);
      enqueueSnackbar('Base de données réinitialisée avec succès', { variant: 'success' });
      handleCloseResetDialog();
    } catch (error) {
      enqueueSnackbar('Erreur lors de la réinitialisation', { variant: 'error' });
    }
  };

  // Dialogue de confirmation de réinitialisation
  const renderResetDatabaseDialog = () => (
    <Dialog
      open={openResetDialog}
      onClose={handleCloseResetDialog}
      aria-labelledby="reset-dialog-title"
      aria-describedby="reset-dialog-description"
    >
      <DialogTitle id="reset-dialog-title">
        {"Réinitialisation de la base de données"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="reset-dialog-description">
          <Alert severity="error" sx={{ mb: 2 }}>
            ATTENTION : Cette action est irréversible et supprimera toutes les données 
            (sauf les utilisateurs). Une sauvegarde sera automatiquement créée.
          </Alert>
          Pour confirmer, entrez le code : RESET_DATABASE_CONFIRM
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          label="Code de confirmation"
          type="text"
          fullWidth
          variant="standard"
          value={resetConfirmation}
          onChange={(e) => setResetConfirmation(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseResetDialog} color="primary">
          Annuler
        </Button>
        <Button 
          onClick={handleConfirmReset} 
          color="error" 
          disabled={resetConfirmation !== 'RESET_DATABASE_CONFIRM'}
        >
          Confirmer la réinitialisation
        </Button>
      </DialogActions>
    </Dialog>
  );
  
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper 
        sx={{ 
          mb: 3, 
          p: 3, 
          background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
          color: 'white'
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Panneau d'administration
        </Typography>
        <Typography variant="body1">
          Gérez les paramètres de l'application, les utilisateurs, les sauvegardes et la synchronisation avec SharePoint.
        </Typography>
      </Paper>
      
      <Box sx={{ width: '100%', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: 64,
              fontSize: '0.9rem'
            }
          }}
        >
          <Tab 
            icon={<DashboardIcon />} 
            iconPosition="start"
            label="Tableau de bord" 
            {...a11yProps(0)}
          />
          <Tab 
            icon={<SyncIcon />} 
            iconPosition="start"
            label="Synchronisation" 
            {...a11yProps(1)}
          />
          <Tab 
            icon={<AdminPanelSettingsIcon />} 
            iconPosition="start"
            label="Rôles et permissions" 
            {...a11yProps(2)}
          />
          <Tab 
            icon={<BackupIcon />} 
            iconPosition="start"
            label="Sauvegardes" 
            {...a11yProps(3)}
          />
          <Tab 
            icon={<BugReportIcon />} 
            iconPosition="start"
            label="Maintenance" 
            {...a11yProps(4)}
          />
          <Tab 
            icon={<MapIcon />} 
            iconPosition="start"
            label="Préférences de marqueurs" 
            {...a11yProps(5)}
          />
          <Tab 
            icon={<MedicalServicesIcon />} 
            iconPosition="start"
            label="Gestion SELAS" 
            {...a11yProps(6)}
          />
          <Tab 
            icon={<BusinessIcon />} 
            iconPosition="start"
            label="Gestion Pôles" 
            {...a11yProps(7)}
          />
        </Tabs>
      </Box>

      {/* Gestion des utilisateurs */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h5" gutterBottom>
          Gestion des utilisateurs
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Cette section vous permet de gérer les comptes utilisateurs et leurs rôles.
        </Alert>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<PeopleIcon />}
          onClick={() => enqueueSnackbar('Fonctionnalité en cours de développement', { variant: 'info' })}
          sx={{ mb: 3 }}
        >
          Accéder à la gestion des utilisateurs
        </Button>
      </TabPanel>

      {/* SharePoint Sync */}
      <TabPanel value={tabValue} index={1}>
        <SharePointSync />
      </TabPanel>

      {/* Rôles et permissions */}
      <TabPanel value={tabValue} index={2}>
        <RoleManagement />
      </TabPanel>

      {/* Sauvegardes */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h5" gutterBottom>
          Gestion des sauvegardes
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Gérez les sauvegardes de la base de données et les restaurations.
        </Alert>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Typography variant="h6">
                    Créer une sauvegarde
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<BackupIcon />}
                  fullWidth
                  sx={{ mb: 2 }}
                  onClick={handleCreateFullBackup}
                >
                  Sauvegarde complète
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  startIcon={<BackupIcon />}
                  fullWidth
                  onClick={handleCreateSelectiveBackup}
                >
                  Sauvegarde sélective
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <CloudDownloadIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                  <Typography variant="h6">
                    Restaurer une sauvegarde
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  color="secondary" 
                  startIcon={<BackupIcon />}
                  fullWidth
                  sx={{ mb: 2 }}
                  onClick={handleRestoreBackup}
                >
                  Restaurer depuis une sauvegarde
                </Button>
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  startIcon={<BackupIcon />}
                  fullWidth
                  onClick={handleImportExternalBackup}
                >
                  Importer une sauvegarde externe
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Gestion des données */}
      <TabPanel value={tabValue} index={4}>
        <Typography variant="h5" gutterBottom>
          Gestion des données
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Gérez les collections de données et effectuez la maintenance de la base de données.
        </Alert>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Collections
                </Typography>
                <List>
                  {Object.entries(collectionsStats).map(([collection, count]) => (
                    <ListItem key={collection}>
                      <ListItemIcon>
                        <StorageIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={collection} 
                        secondary={`${count} documents`}
                      />
                      <Chip 
                        label={`${count} docs`} 
                        color="primary" 
                        variant="outlined"
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Maintenance
                </Typography>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  fullWidth
                  sx={{ mb: 2 }}
                  onClick={handleCleanupData}
                >
                  Nettoyer les données obsolètes
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  fullWidth
                  sx={{ mb: 2 }}
                  onClick={handleOptimizeIndexes}
                >
                  Optimiser les index
                </Button>
                <Button 
                  variant="outlined" 
                  color="error" 
                  fullWidth
                  startIcon={<WarningIcon />}
                  onClick={handleOpenResetDialog}
                >
                  Réinitialiser la base de données
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Préférences de marqueurs */}
      <TabPanel value={tabValue} index={5}>
        <Typography variant="h5" gutterBottom>
          Préférences des marqueurs de la carte
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Personnalisez l'apparence des marqueurs sur la carte en fonction des types de sites.
          Cette fonctionnalité est réservée aux utilisateurs ayant les permissions nécessaires.
        </Alert>
        {isAdmin ? (
          <MarkerPreferences />
        ) : (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Vous n'avez pas les droits nécessaires pour accéder à cette fonctionnalité.
            Seuls les utilisateurs avec la permission "Modification des marqueurs" peuvent modifier les préférences de marqueurs.
          </Alert>
        )}
      </TabPanel>
      
      {/* Gestion SELAS */}
      <TabPanel value={tabValue} index={6}>
        <Typography variant="h5" gutterBottom>
          Gestion des SELAS
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Gérez les sociétés d'exercice libéral (SELAS) et leurs paramètres.
        </Alert>
        {isAdmin ? (
          <SELASManagement />
        ) : (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Vous n'avez pas les droits nécessaires pour accéder à cette fonctionnalité.
            Seuls les administrateurs peuvent gérer les SELAS.
          </Alert>
        )}
      </TabPanel>
      
      {/* Gestion Pôles */}
      <TabPanel value={tabValue} index={7}>
        <Typography variant="h5" gutterBottom>
          Gestion des Pôles
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Gérez les pôles d'activité et leurs associations avec les SELAS.
        </Alert>
        {isAdmin ? (
          <PoleManagement />
        ) : (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Vous n'avez pas les droits nécessaires pour accéder à cette fonctionnalité.
            Seuls les administrateurs peuvent gérer les pôles.
          </Alert>
        )}
      </TabPanel>

      {renderResetDatabaseDialog()}
    </Container>
  );
};

export default AdminPanel; 
