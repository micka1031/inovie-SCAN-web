import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminPanel from './AdminPanel';
import { useAuth } from '../contexts/AuthContext';
import { vi } from 'vitest';

// Mock du contexte d'authentification
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock du composant SharePointSync
vi.mock('./SharePointSync', () => ({
  default: () => <div data-testid="sharepoint-sync">SharePoint Sync Component</div>
}));

describe('AdminPanel Component', () => {
  beforeEach(() => {
    // Configuration par défaut du mock useAuth
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: {
        role: 'Administrateur',
        nom: 'Admin Test',
        email: 'admin@test.com'
      }
    });
  });

  test('renders access denied message for non-admin users', () => {
    // Simuler un utilisateur non administrateur
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: {
        role: 'Utilisateur',
        nom: 'User Test',
        email: 'user@test.com'
      }
    });

    render(<AdminPanel />);
    
    expect(screen.getByText('Accès refusé')).toBeInTheDocument();
    expect(screen.getByText(/Vous n'avez pas les droits nécessaires/)).toBeInTheDocument();
  });

  test('renders admin panel for admin users', () => {
    render(<AdminPanel />);
    
    expect(screen.getByText('Panneau d\'administration')).toBeInTheDocument();
    expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
    expect(screen.getByText('SharePoint')).toBeInTheDocument();
    expect(screen.getByText('Sauvegardes')).toBeInTheDocument();
    expect(screen.getByText('Données')).toBeInTheDocument();
    expect(screen.getByText('Paramètres')).toBeInTheDocument();
    expect(screen.getByText('Logs')).toBeInTheDocument();
  });

  test('switches tabs correctly', () => {
    render(<AdminPanel />);
    
    // Vérifier que le tableau de bord est affiché par défaut
    expect(screen.getByText('Tableau de bord d\'administration')).toBeInTheDocument();
    
    // Cliquer sur l'onglet SharePoint
    fireEvent.click(screen.getByText('SharePoint'));
    
    // Vérifier que le composant SharePointSync est affiché
    expect(screen.getByTestId('sharepoint-sync')).toBeInTheDocument();
    
    // Cliquer sur l'onglet Utilisateurs
    fireEvent.click(screen.getByText('Utilisateurs'));
    
    // Vérifier que la section de gestion des utilisateurs est affichée
    expect(screen.getByText('Gestion des utilisateurs')).toBeInTheDocument();
    expect(screen.getByText('Actions rapides')).toBeInTheDocument();
  });

  test('dashboard cards navigate to correct tabs', () => {
    render(<AdminPanel />);
    
    // Trouver le bouton "Accéder" pour la synchronisation SharePoint
    const sharePointButton = screen.getAllByText('Accéder')[1]; // Le deuxième bouton "Accéder"
    
    // Cliquer sur le bouton
    fireEvent.click(sharePointButton);
    
    // Vérifier que le composant SharePointSync est affiché
    expect(screen.getByTestId('sharepoint-sync')).toBeInTheDocument();
  });
}); 
