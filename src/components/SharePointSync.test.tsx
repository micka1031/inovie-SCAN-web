import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SharePointSync from './SharePointSync';
import SharePointService from '../services/SharePointService';
import { vi } from 'vitest';

// Mock du service SharePoint
vi.mock('../services/SharePointService', () => ({
  default: {
    downloadCollectionAsCSV: vi.fn(),
    downloadCollectionAsJSON: vi.fn(),
    downloadAllCollectionsAsCSV: vi.fn(),
    downloadAllCollectionsAsJSON: vi.fn(),
    generateCompleteBackup: vi.fn(),
    importCSVToCollection: vi.fn(),
    importJSONToCollection: vi.fn(),
    importFromZip: vi.fn(),
  }
}));

describe('SharePointSync Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders the component correctly', () => {
    render(<SharePointSync />);
    
    // Vérifier que les titres sont présents
    expect(screen.getByText('Synchronisation SharePoint')).toBeInTheDocument();
    expect(screen.getByText('Exporter des données')).toBeInTheDocument();
    expect(screen.getByText('Importer des données')).toBeInTheDocument();
  });

  test('handles export collection selection', () => {
    render(<SharePointSync />);
    
    // Sélectionner une collection
    const collectionSelect = screen.getByLabelText('Collection à exporter');
    fireEvent.mouseDown(collectionSelect);
    
    // Sélectionner "passages" dans le menu déroulant
    const passagesOption = screen.getByText('passages');
    fireEvent.click(passagesOption);
    
    // Vérifier que le bouton d'exportation est activé
    const exportButton = screen.getByText('Exporter');
    expect(exportButton).not.toBeDisabled();
  });

  test('handles export format selection', () => {
    render(<SharePointSync />);
    
    // Sélectionner une collection d'abord
    const collectionSelect = screen.getByLabelText('Collection à exporter');
    fireEvent.mouseDown(collectionSelect);
    const passagesOption = screen.getByText('passages');
    fireEvent.click(passagesOption);
    
    // Sélectionner un format
    const formatSelect = screen.getByLabelText('Format d\'exportation');
    fireEvent.mouseDown(formatSelect);
    
    // Sélectionner "CSV" dans le menu déroulant
    const csvOption = screen.getByText('CSV');
    fireEvent.click(csvOption);
  });

  test('exports a collection as JSON', async () => {
    render(<SharePointSync />);
    
    // Sélectionner une collection
    const collectionSelect = screen.getByLabelText('Collection à exporter');
    fireEvent.mouseDown(collectionSelect);
    const passagesOption = screen.getByText('passages');
    fireEvent.click(passagesOption);
    
    // Cliquer sur le bouton d'exportation
    const exportButton = screen.getByText('Exporter');
    fireEvent.click(exportButton);
    
    // Vérifier que la méthode d'exportation a été appelée
    await waitFor(() => {
      expect(SharePointService.downloadCollectionAsJSON).toHaveBeenCalledWith('passages');
    });
  });

  test('exports a collection as CSV', async () => {
    render(<SharePointSync />);
    
    // Sélectionner une collection
    const collectionSelect = screen.getByLabelText('Collection à exporter');
    fireEvent.mouseDown(collectionSelect);
    const passagesOption = screen.getByText('passages');
    fireEvent.click(passagesOption);
    
    // Sélectionner le format CSV
    const formatSelect = screen.getByLabelText('Format d\'exportation');
    fireEvent.mouseDown(formatSelect);
    const csvOption = screen.getByText('CSV');
    fireEvent.click(csvOption);
    
    // Cliquer sur le bouton d'exportation
    const exportButton = screen.getByText('Exporter');
    fireEvent.click(exportButton);
    
    // Vérifier que la méthode d'exportation a été appelée
    await waitFor(() => {
      expect(SharePointService.downloadCollectionAsCSV).toHaveBeenCalledWith('passages');
    });
  });

  test('exports all collections', async () => {
    render(<SharePointSync />);
    
    // Sélectionner "Toutes les collections"
    const collectionSelect = screen.getByLabelText('Collection à exporter');
    fireEvent.mouseDown(collectionSelect);
    const allOption = screen.getByText('Toutes les collections');
    fireEvent.click(allOption);
    
    // Cliquer sur le bouton d'exportation
    const exportButton = screen.getByText('Exporter');
    fireEvent.click(exportButton);
    
    // Vérifier que la méthode d'exportation a été appelée
    await waitFor(() => {
      expect(SharePointService.downloadAllCollectionsAsJSON).toHaveBeenCalled();
    });
  });

  test('generates a complete backup', async () => {
    render(<SharePointSync />);
    
    // Sélectionner "Toutes les collections"
    const collectionSelect = screen.getByLabelText('Collection à exporter');
    fireEvent.mouseDown(collectionSelect);
    const allOption = screen.getByText('Toutes les collections');
    fireEvent.click(allOption);
    
    // Sélectionner le format ZIP
    const formatSelect = screen.getByLabelText('Format d\'exportation');
    fireEvent.mouseDown(formatSelect);
    const zipOption = screen.getByText('ZIP (toutes les collections en JSON)');
    fireEvent.click(zipOption);
    
    // Cliquer sur le bouton d'exportation
    const exportButton = screen.getByText('Exporter');
    fireEvent.click(exportButton);
    
    // Vérifier que la méthode d'exportation a été appelée
    await waitFor(() => {
      expect(SharePointService.generateCompleteBackup).toHaveBeenCalled();
    });
  });

  // Note: Les tests d'importation sont plus complexes car ils nécessitent de simuler
  // le téléchargement de fichiers, ce qui est difficile à tester avec Jest.
  // Ces tests pourraient être ajoutés ultérieurement si nécessaire.
}); 
