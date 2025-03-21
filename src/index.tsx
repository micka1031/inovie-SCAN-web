import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// Ant Design 5.x utilise une méthode différente pour les styles
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

// Gestionnaire d'erreurs global
const handleGlobalError = (event: ErrorEvent) => {
  console.error('Erreur globale non gérée:', event.error);
  // Vous pouvez ajouter ici une logique pour afficher un message d'erreur à l'utilisateur
  // ou envoyer l'erreur à un service de suivi des erreurs
};

// Ajouter le gestionnaire d'erreurs
window.addEventListener('error', handleGlobalError);

// Gestionnaire pour les rejets de promesses non gérés
window.addEventListener('unhandledrejection', (event) => {
  console.error('Promesse rejetée non gérée:', event.reason);
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
