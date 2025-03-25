import React, { useState } from 'react';
import './AdminCredentialsModal.css';

interface AdminCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (credentials: { email: string; password: string }) => void;
  defaultEmail?: string;
}

const AdminCredentialsModal: React.FC<AdminCredentialsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  defaultEmail = ''
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation simple
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    
    // Soumettre les informations d'identification
    onSubmit({ email, password });
    
    // Réinitialiser le formulaire
    setPassword('');
    setError(null);
  };

  return (
    <div className="admin-credentials-modal-overlay">
      <div className="admin-credentials-modal">
        <div className="admin-credentials-modal-header">
          <h2>Confirmation d'identité administrateur</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="admin-credentials-modal-content">
          <p>
            Pour créer un nouvel utilisateur sans être déconnecté, veuillez confirmer vos identifiants administrateur.
            Ces informations seront utilisées uniquement pour vous reconnecter automatiquement après la création de l'utilisateur.
          </p>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="admin-email">Email administrateur</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email administrateur"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="admin-password">Mot de passe</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
              />
            </div>
            
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="button button-primary">
                Confirmer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminCredentialsModal; 
