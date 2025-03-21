import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Typography, 
  Paper, 
  Divider, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormControlLabel, 
  Checkbox, 
  Alert, 
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoIcon from '@mui/icons-material/Info';
import SharePointService from '../services/SharePointService';

/**
 * Composant pour la synchronisation manuelle entre Firebase et SharePoint
 * Permet l'export et l'import de données via fichiers CSV/JSON/ZIP
 */
const SharePointSync: React.FC = () => {
  // États pour l'exportation
  const [exportCollection, setExportCollection] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<string>('json');
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  
  // États pour l'importation
  const [importCollection, setImportCollection] = useState<string>('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState({
    clearCollection: false,
    updateExisting: true
  });
  const [importLoading, setImportLoading] = useState<boolean>(false);
  
  // États pour les messages
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Liste des collections disponibles
  const collections = ['passages', 'sites', 'tournees', 'vehicules'];
  
  /**
   * Gère l'exportation d'une collection
   */
  const handleExport = async () => {
    try {
      setExportLoading(true);
      setSuccessMessage('');
      setErrorMessage('');
      
      if (!exportCollection) {
        setErrorMessage('Veuillez sélectionner une collection à exporter.');
        return;
      }
      
      if (exportCollection === 'all') {
        if (exportFormat === 'json') {
          await SharePointService.downloadAllCollectionsAsJSON();
        } else if (exportFormat === 'csv') {
          await SharePointService.downloadAllCollectionsAsCSV();
        } else if (exportFormat === 'zip') {
          await SharePointService.generateCompleteBackup();
        }
        
        setSuccessMessage('Toutes les collections ont été exportées avec succès.');
      } else {
        if (exportFormat === 'json') {
          await SharePointService.downloadCollectionAsJSON(exportCollection);
        } else if (exportFormat === 'csv') {
          await SharePointService.downloadCollectionAsCSV(exportCollection);
        }
        
        setSuccessMessage(`La collection ${exportCollection} a été exportée avec succès.`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'exportation:', error);
      setErrorMessage(`Erreur lors de l'exportation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setExportLoading(false);
    }
  };
  
  /**
   * Gère la sélection d'un fichier à importer
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setImportFile(event.target.files[0]);
    }
  };
  
  /**
   * Gère l'importation d'un fichier
   */
  const handleImport = async () => {
    try {
      setImportLoading(true);
      setSuccessMessage('');
      setErrorMessage('');
      
      if (!importFile) {
        setErrorMessage('Veuillez sélectionner un fichier à importer.');
        return;
      }
      
      if (!importCollection && importFile.name.endsWith('.zip')) {
        // Pour les fichiers ZIP, la collection n'est pas nécessaire
      } else if (!importCollection) {
        setErrorMessage('Veuillez sélectionner une collection cible.');
        return;
      }
      
      // Vérifier le type de fichier
      const fileExtension = importFile.name.split('.').pop()?.toLowerCase();
      if (!['zip', 'json', 'csv', 'txt'].includes(fileExtension || '')) {
        setErrorMessage(`Format de fichier non pris en charge: ${fileExtension}. Veuillez utiliser un fichier .json, .csv, .txt ou .zip.`);
        return;
      }
      
      try {
        let count = 0;
        
        if (importFile.name.endsWith('.zip')) {
          const fileContent = await importFile.arrayBuffer();
          const results = await SharePointService.importFromZip(fileContent, importOptions);
          
          const totalImported = Object.values(results).reduce((sum, count) => sum + count, 0);
          setSuccessMessage(`Importation réussie: ${totalImported} documents importés dans ${Object.keys(results).length} collections.`);
        } else if (importFile.name.endsWith('.json')) {
          let jsonContent;
          try {
            const fileText = await importFile.text();
            jsonContent = JSON.parse(fileText);
          } catch (parseError) {
            console.error('Erreur lors de l\'analyse du fichier JSON:', parseError);
            setErrorMessage(`Le fichier JSON est invalide et ne peut pas être analysé. Erreur: ${parseError instanceof Error ? parseError.message : 'Format JSON incorrect'}`);
            return;
          }
          
          if (!Array.isArray(jsonContent)) {
            setErrorMessage('Le fichier JSON doit contenir un tableau d\'objets.');
            return;
          }
          
          count = await SharePointService.importJSONToCollection(
            importCollection,
            jsonContent,
            importOptions
          );
          
          setSuccessMessage(`Importation réussie: ${count} documents importés dans la collection ${importCollection}.`);
        } else if (importFile.name.endsWith('.csv') || importFile.name.endsWith('.txt')) {
          let csvContent;
          try {
            csvContent = await importFile.text();
            
            // Vérifier que le contenu CSV/TXT est valide
            if (!csvContent || csvContent.trim() === '') {
              setErrorMessage('Le fichier est vide.');
              return;
            }
            
            // Vérifier que le fichier a au moins une ligne d'en-tête
            const lines = csvContent.split('\n');
            if (lines.length < 1 || lines[0].trim() === '') {
              setErrorMessage('Le fichier ne contient pas d\'en-têtes valides.');
              return;
            }
            
            console.log(`Fichier ${importFile.name.endsWith('.txt') ? 'TXT' : 'CSV'} chargé: ${importFile.name}, taille: ${importFile.size} octets, première ligne: ${lines[0].substring(0, 100)}...`);
          } catch (readError) {
            console.error(`Erreur lors de la lecture du fichier ${importFile.name.endsWith('.txt') ? 'TXT' : 'CSV'}:`, readError);
            setErrorMessage(`Impossible de lire le fichier. Erreur: ${readError instanceof Error ? readError.message : 'Erreur de lecture'}`);
            return;
          }
          
          if (importCollection === 'sites') {
            // Utiliser la fonction spécifique pour les sites
            count = await SharePointService.importSitesFromCSV(
              csvContent,
              {
                ...importOptions,
                isTxtFile: importFile.name.endsWith('.txt'),
                fileName: importFile.name
              }
            );
          } else {
            // Utiliser la fonction générique pour les autres collections
            count = await SharePointService.importCSVToCollection(
              importCollection,
              csvContent,
              importOptions
            );
          }
          
          setSuccessMessage(`Importation réussie: ${count} documents importés dans la collection ${importCollection}.`);
        } else {
          setErrorMessage('Format de fichier non pris en charge. Veuillez utiliser un fichier .json, .csv, .txt ou .zip.');
        }
      } catch (importError) {
        console.error('Erreur détaillée lors de l\'importation:', importError);
        
        // Traitement spécifique pour l'erreur "n.indexOf is not a function"
        if (importError instanceof Error && importError.message.includes('indexOf is not a function')) {
          setErrorMessage(`Erreur de format: Le fichier CSV contient probablement un format non standard ou des caractères spéciaux. 
            Veuillez vérifier que votre fichier est correctement formaté avec des séparateurs standards (virgules, points-virgules ou tabulations).
            Conseil: Ouvrez le fichier dans un éditeur de texte pour vérifier sa structure.`);
        } else {
          setErrorMessage(`Erreur lors de l'importation: ${importError instanceof Error ? importError.message : 'Erreur inconnue'}`);
        }
      }
    } catch (error) {
      console.error('Erreur générale lors de l\'importation:', error);
      setErrorMessage(`Erreur lors de l'importation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setImportLoading(false);
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Synchronisation SharePoint
        <Tooltip title="Cette fonctionnalité permet d'exporter et d'importer des données entre Firebase et SharePoint via des fichiers intermédiaires.">
          <IconButton size="small" sx={{ ml: 1 }}>
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          Cette interface permet de synchroniser manuellement les données entre Firebase et SharePoint.
          En raison des limitations d'authentification, la synchronisation se fait via des fichiers intermédiaires.
        </Typography>
      </Alert>
      
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* Section d'exportation */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Exporter des données
              <Tooltip title="Exporter les données de Firebase vers un fichier que vous pourrez ensuite importer dans SharePoint.">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon />
                </IconButton>
              </Tooltip>
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Collection à exporter</InputLabel>
              <Select
                value={exportCollection}
                onChange={(e) => setExportCollection(e.target.value)}
                label="Collection à exporter"
              >
                <MenuItem value="">Sélectionner une collection</MenuItem>
                {collections.map((collection) => (
                  <MenuItem key={collection} value={collection}>
                    {collection}
                  </MenuItem>
                ))}
                <MenuItem value="all">Toutes les collections</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Format d'exportation</InputLabel>
              <Select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                label="Format d'exportation"
              >
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
                {exportCollection === 'all' && (
                  <MenuItem value="zip">ZIP (toutes les collections en JSON)</MenuItem>
                )}
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={exportLoading ? <CircularProgress size={24} color="inherit" /> : <CloudDownloadIcon />}
              onClick={handleExport}
              disabled={exportLoading || !exportCollection}
              sx={{ mt: 2 }}
            >
              {exportLoading ? 'Exportation en cours...' : 'Exporter'}
            </Button>
            
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Instructions pour SharePoint</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  1. Exportez les données en utilisant le bouton ci-dessus.<br />
                  2. Connectez-vous à votre site SharePoint.<br />
                  3. Accédez à la bibliothèque de documents où vous souhaitez stocker les données.<br />
                  4. Cliquez sur "Charger" et sélectionnez le fichier exporté.<br />
                  5. Vérifiez que le fichier a été correctement chargé.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Paper>
        </Grid>
        
        {/* Section d'importation */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Importer des données
              <Tooltip title="Importer des données depuis un fichier SharePoint vers Firebase.">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon />
                </IconButton>
              </Tooltip>
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Collection cible</InputLabel>
              <Select
                value={importCollection}
                onChange={(e) => setImportCollection(e.target.value)}
                label="Collection cible"
                disabled={importFile?.name.endsWith('.zip')}
              >
                <MenuItem value="">Sélectionner une collection</MenuItem>
                {collections.map((collection) => (
                  <MenuItem key={collection} value={collection}>
                    {collection}
                  </MenuItem>
                ))}
              </Select>
              {importFile?.name.endsWith('.zip') && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Pour les fichiers ZIP, la collection est déterminée automatiquement.
                </Typography>
              )}
            </FormControl>
            
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<CloudUploadIcon />}
              >
                Sélectionner un fichier
                <input
                  type="file"
                  hidden
                  accept=".json,.csv,.zip,.txt"
                  onChange={handleFileChange}
                />
              </Button>
              {importFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Fichier sélectionné: {importFile.name}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Formats supportés: JSON, CSV, ZIP, et TXT (pour les sites)
              </Typography>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={importOptions.clearCollection}
                    onChange={(e) => setImportOptions({ ...importOptions, clearCollection: e.target.checked })}
                  />
                }
                label="Vider la collection avant l'importation"
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={importOptions.updateExisting}
                    onChange={(e) => setImportOptions({ ...importOptions, updateExisting: e.target.checked })}
                  />
                }
                label="Mettre à jour les documents existants"
              />
            </Box>
            
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              startIcon={importLoading ? <CircularProgress size={24} color="inherit" /> : <CloudUploadIcon />}
              onClick={handleImport}
              disabled={importLoading || !importFile || (!importCollection && !importFile?.name.endsWith('.zip'))}
              sx={{ mt: 2 }}
            >
              {importLoading ? 'Importation en cours...' : 'Importer'}
            </Button>
            
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Instructions pour SharePoint</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  1. Connectez-vous à votre site SharePoint.<br />
                  2. Accédez à la bibliothèque de documents où sont stockées les données.<br />
                  3. Téléchargez le fichier que vous souhaitez importer.<br />
                  4. Revenez à cette page et sélectionnez le fichier téléchargé.<br />
                  5. Choisissez la collection cible et les options d'importation.<br />
                  6. Cliquez sur "Importer" pour lancer l'importation.
                </Typography>
              </AccordionDetails>
            </Accordion>
            
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Format CSV/TXT attendu</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" gutterBottom>
                  <strong>Pour l'importation des sites</strong>, votre fichier CSV ou TXT doit contenir les colonnes suivantes (séparées par des virgules, des points-virgules ou des tabulations) :
                </Typography>
                <Typography variant="body2" component="div" sx={{ mt: 1, mb: 2 }}>
                  <code style={{ display: 'block', whiteSpace: 'pre-wrap', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                    PÔLE,NOM,TYPE,ADRESSE,VILLE,CODE POSTAL,TELEPHONE,EMAIL,CODE-BARRE,TOURNÉES,CODE PORTE,COORDONNÉES,STATUT
                  </code>
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Exemple de ligne valide :</strong>
                </Typography>
                <Typography variant="body2" component="div" sx={{ mt: 1, mb: 2 }}>
                  <code style={{ display: 'block', whiteSpace: 'pre-wrap', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                    Pôle Est,Laboratoire Central,Laboratoire,15 Rue des Sciences,Paris,75001,0123456789,lab@example.com,LAB001,"tournee1,tournee2",CODE123,,ACTIF
                  </code>
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Notes importantes :</strong>
                </Typography>
                <ul style={{ fontSize: '0.875rem', paddingLeft: '20px' }}>
                  <li>Assurez-vous que chaque site est sur une ligne distincte</li>
                  <li>Les tournées peuvent être séparées par des virgules à l'intérieur de guillemets</li>
                  <li>Si votre fichier provient d'Excel, utilisez "Enregistrer sous" et choisissez le format CSV ou TXT</li>
                  <li>Vérifiez que votre fichier utilise un séparateur standard (virgule, point-virgule ou tabulation)</li>
                  <li>Si vous avez des problèmes, essayez d'ouvrir votre fichier dans un éditeur de texte pour vérifier sa structure</li>
                </ul>
                <Typography variant="body2" sx={{ mt: 2 }} color="primary">
                  <strong>Recommandation pour les fichiers TXT :</strong> Pour une meilleure compatibilité, exportez depuis Excel en choisissant "Texte (séparateur : tabulation) (*.txt)". Les fichiers TXT utilisent par défaut la tabulation comme séparateur, ce qui évite les problèmes avec les virgules ou points-virgules dans les données.
                </Typography>
              </AccordionDetails>
            </Accordion>
            
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Résolution des problèmes d'importation</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" gutterBottom>
                  <strong>Erreur "n.indexOf is not a function"</strong>
                </Typography>
                <Typography variant="body2" paragraph>
                  Cette erreur se produit généralement lorsque le format du fichier CSV n'est pas standard. Voici comment la résoudre :
                </Typography>
                <ol style={{ fontSize: '0.875rem', paddingLeft: '20px' }}>
                  <li>
                    <strong>Vérifiez le format du fichier</strong> : Ouvrez votre fichier CSV ou TXT dans un éditeur de texte (comme Notepad) et vérifiez que :
                    <ul style={{ marginTop: '4px' }}>
                      <li>La première ligne contient bien les en-têtes des colonnes</li>
                      <li>Les colonnes sont séparées par des virgules, des points-virgules ou des tabulations</li>
                      <li>Il n'y a pas de caractères spéciaux ou de formatage particulier</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Depuis Excel</strong> : Si vous exportez depuis Excel, suivez ces étapes :
                    <ul style={{ marginTop: '4px' }}>
                      <li>Sélectionnez "Fichier" &gt; "Enregistrer sous"</li>
                      <li>Choisissez "CSV (séparateur : point-virgule) (*.csv)" ou "Texte (séparateur : tabulation) (*.txt)"</li>
                      <li>Cliquez sur "Enregistrer"</li>
                      <li>Ignorez les avertissements sur les fonctionnalités incompatibles</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Créez un nouveau fichier</strong> : Si les solutions ci-dessus ne fonctionnent pas, créez un nouveau fichier CSV ou TXT :
                    <ul style={{ marginTop: '4px' }}>
                      <li>Ouvrez un éditeur de texte vide (comme Notepad)</li>
                      <li>Copiez-collez les en-têtes sur la première ligne, séparés par des virgules ou des tabulations</li>
                      <li>Ajoutez vos données sur les lignes suivantes, en respectant le même format</li>
                      <li>Enregistrez le fichier avec l'extension .csv ou .txt</li>
                    </ul>
                  </li>
                </ol>
                <Typography variant="body2" sx={{ mt: 2 }} paragraph>
                  <strong>Exemple de fichier CSV/TXT valide</strong> (ouvert dans un éditeur de texte) :
                </Typography>
                <Typography variant="body2" component="div" sx={{ mt: 1, mb: 2 }}>
                  <code style={{ display: 'block', whiteSpace: 'pre-wrap', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                    PÔLE,NOM,TYPE,ADRESSE,VILLE,CODE POSTAL,TELEPHONE,EMAIL,CODE-BARRE,TOURNÉES,CODE PORTE,COORDONNÉES,STATUT<br/>
                    Pôle Est,Laboratoire Central,Laboratoire,15 Rue des Sciences,Paris,75001,0123456789,lab@example.com,LAB001,"tournee1,tournee2",CODE123,,ACTIF<br/>
                    Pôle Ouest,Entrepôt Principal,Entrepôt,25 Avenue du Commerce,Lyon,69002,0987654321,entrepot@example.com,ENT002,tournee3,CODE456,,ACTIF
                  </code>
                </Typography>
                
                <Typography variant="body2" gutterBottom>
                  <strong>Erreur "Aucun document valide n'a pu être extrait du fichier"</strong>
                </Typography>
                <Typography variant="body2" paragraph>
                  Cette erreur peut être causée par des problèmes d'encodage, particulièrement avec les caractères accentués. Voici comment la résoudre :
                </Typography>
                <ol style={{ fontSize: '0.875rem', paddingLeft: '20px' }}>
                  <li>
                    <strong>Vérifiez l'encodage du fichier</strong> : Assurez-vous que votre fichier est enregistré en UTF-8 :
                    <ul style={{ marginTop: '4px' }}>
                      <li>Dans Excel, utilisez "Enregistrer sous" et sélectionnez "CSV UTF-8 (délimité par des virgules) (*.csv)"</li>
                      <li>Dans Notepad, utilisez "Enregistrer sous" et sélectionnez "UTF-8" dans le menu déroulant "Encodage"</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Vérifiez les en-têtes</strong> : Assurez-vous que vos en-têtes correspondent aux noms attendus :
                    <ul style={{ marginTop: '4px' }}>
                      <li>Les en-têtes doivent contenir au moins "NOM" ou "CODE-BARRE" pour identifier chaque site</li>
                      <li>Vérifiez que les accents sont correctement encodés (ex: "PÔLE" et non "PLE")</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Utilisez un format TXT avec tabulations</strong> : Les fichiers TXT avec tabulations sont souvent plus fiables :
                    <ul style={{ marginTop: '4px' }}>
                      <li>Dans Excel, utilisez "Enregistrer sous" et sélectionnez "Texte (séparateur : tabulation) (*.txt)"</li>
                      <li>Cela évite les problèmes avec les virgules ou points-virgules dans les données</li>
                    </ul>
                  </li>
                </ol>
              </AccordionDetails>
            </Accordion>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SharePointSync; 
