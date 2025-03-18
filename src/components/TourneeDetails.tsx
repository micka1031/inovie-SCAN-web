import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './TourneeDetails.css';

interface Tournee {
  id: string;
  nom: string;
  description: string;
  vehicule: string;
  chauffeur: string;
  statut: string;
  dateCreation: Date;
  dateModification: Date;
}

const TourneeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournee, setTournee] = useState<Tournee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournee = async () => {
      if (!id) return;

      try {
        const tourneeDoc = await getDoc(doc(db, 'tournees', id));
        if (tourneeDoc.exists()) {
          const data = tourneeDoc.data();
          setTournee({
            id: tourneeDoc.id,
            nom: data.nom || '',
            description: data.description || '',
            vehicule: data.vehicule || '',
            chauffeur: data.chauffeur || '',
            statut: data.statut || 'inconnu',
            dateCreation: data.dateCreation?.toDate() || new Date(),
            dateModification: data.dateModification?.toDate() || new Date()
          });
        } else {
          setError('Tournée non trouvée');
        }
      } catch (err) {
        console.error('Erreur lors de la récupération de la tournée:', err);
        setError('Une erreur est survenue lors de la récupération de la tournée');
      } finally {
        setLoading(false);
      }
    };

    fetchTournee();
  }, [id]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={() => navigate('/tournees')} className="back-button">
          Retour aux tournées
        </button>
      </div>
    );
  }

  if (!tournee) {
    return null;
  }

  return (
    <div className="tournee-details-container">
      <div className="tournee-details-header">
        <h1>Détails de la Tournée</h1>
        <button onClick={() => navigate('/tournees')} className="back-button">
          Retour aux tournées
        </button>
      </div>

      <div className="tournee-details-content">
        <div className="detail-group">
          <label>Nom</label>
          <p>{tournee.nom}</p>
        </div>

        <div className="detail-group">
          <label>Description</label>
          <p>{tournee.description || '-'}</p>
        </div>

        <div className="detail-group">
          <label>Véhicule</label>
          <p>{tournee.vehicule || '-'}</p>
        </div>

        <div className="detail-group">
          <label>Chauffeur</label>
          <p>{tournee.chauffeur || '-'}</p>
        </div>

        <div className="detail-group">
          <label>Statut</label>
          <span className={`status-badge ${tournee.statut.toLowerCase()}`}>
            {tournee.statut}
          </span>
        </div>

        <div className="detail-group">
          <label>Date de création</label>
          <p>{tournee.dateCreation.toLocaleDateString()}</p>
        </div>

        <div className="detail-group">
          <label>Dernière modification</label>
          <p>{tournee.dateModification.toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

export default TourneeDetails; 