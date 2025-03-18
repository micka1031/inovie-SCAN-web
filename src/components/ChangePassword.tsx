import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './ChangePassword.css';

interface ChangePasswordProps {
  userId: string;
  onClose: () => void;
}

const ChangePassword: React.FC<ChangePasswordProps> = ({ userId, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      // Vérifier que les mots de passe correspondent
      if (newPassword !== confirmPassword) {
        throw new Error('Les nouveaux mots de passe ne correspondent pas');
      }

      // Vérifier que le nouveau mot de passe est différent de l'ancien
      if (currentPassword === newPassword) {
        throw new Error('Le nouveau mot de passe doit être différent de l\'ancien');
      }

      // Vérifier que le nouveau mot de passe fait au moins 6 caractères
      if (newPassword.length < 6) {
        throw new Error('Le nouveau mot de passe doit faire au moins 6 caractères');
      }

      // Mettre à jour le mot de passe dans Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        password: newPassword
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Erreur lors du changement de mot de passe:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-overlay">
      <div className="change-password-modal">
        <div className="modal-header">
          <h2>Changer le mot de passe</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="change-password-form">
          <div className="form-group">
            <label htmlFor="currentPassword">Mot de passe actuel</label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">Nouveau mot de passe</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">Mot de passe modifié avec succès !</div>}

          <div className="button-group">
            <button type="button" className="cancel-button" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword; 