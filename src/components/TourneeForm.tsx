import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './TourneeForm.css';

const TourneeForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    vehicule: '',
    chauffeur: '',
    statut: 'actif'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const tourneeData = {
        ...formData,
        dateCreation: new Date(),
        dateModification: new Date()
      };

      await addDoc(collection(db, 'tournees'), tourneeData);
      navigate('/tournees');
    } catch (err) {
      console.error('Erreur lors de la création de la tournée:', err);
      setError('Une erreur est survenue lors de la création de la tournée.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="tournee-form-container">
      <h1>Nouvelle Tournée</h1>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit} className="tournee-form">
        <div className="form-group">
          <label htmlFor="nom">Nom de la tournée</label>
          <input
            type="text"
            id="nom"
            name="nom"
            value={formData.nom}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="vehicule">Véhicule</label>
          <input
            type="text"
            id="vehicule"
            name="vehicule"
            value={formData.vehicule}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="chauffeur">Chauffeur</label>
          <input
            type="text"
            id="chauffeur"
            name="chauffeur"
            value={formData.chauffeur}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="statut">Statut</label>
          <select
            id="statut"
            name="statut"
            value={formData.statut}
            onChange={handleChange}
          >
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
          </select>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/tournees')}
            className="cancel-button"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Création...' : 'Créer la tournée'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TourneeForm; 