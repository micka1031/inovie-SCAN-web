import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

interface Passage {
  id: string;
  siteDépart: string;
  dhDépart: Timestamp;
  idColis: string;
  statut: 'Livré' | 'En cours';
  siteFin?: string;
  dhLivraison?: Timestamp;
  coursierCharg?: string;
  coursierLivraison?: string;
  véhicule?: string;
}

const Passages: React.FC = () => {
  const [passages, setPassages] = useState<Passage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtres
  const [dateDebut, setDateDebut] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [dateFin, setDateFin] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [tournée, setTournée] = useState<string>('');
  const [statut, setStatut] = useState<string>('');
  const [site, setSite] = useState<string>('');
  const [véhicule, setVéhicule] = useState<string>('');
  const [idColis, setIdColis] = useState<string>('');

  useEffect(() => {
    fetchPassages();
  }, []);

  const fetchPassages = async () => {
    try {
      setLoading(true);
      
      // Simuler des données pour la démonstration
      const mockPassages = [
        {
          id: '1',
          siteDépart: 'Laboratoire Bonnefoy',
          dhDépart: convertToTimestamp('2023-02-24 07:25'),
          idColis: '30072001529',
          statut: 'Livré' as const,
          siteFin: 'Clinique SUB',
          dhLivraison: convertToTimestamp('2023-02-24 08:40'),
          coursierCharg: 'sebastien.lherlier@novus.fr',
          coursierLivraison: 'sebastien.lherlier@novus.fr',
          véhicule: 'GE-695-RT'
        },
        {
          id: '2',
          siteDépart: 'Clinique Saint-Jean',
          dhDépart: convertToTimestamp('2023-02-24 07:15'),
          idColis: '15000434563',
          statut: 'Livré' as const,
          siteFin: 'Laboratoire Central',
          dhLivraison: convertToTimestamp('2023-02-24 08:10'),
          coursierCharg: 'sebastien.lherlier@novus.fr',
          coursierLivraison: 'sebastien.lherlier@novus.fr',
          véhicule: 'GE-695-RT'
        },
        {
          id: '3',
          siteDépart: 'Centre Médical Rangueil',
          dhDépart: convertToTimestamp('2023-02-24 07:05'),
          idColis: '15000199845',
          statut: 'Livré' as const,
          siteFin: 'Laboratoire Central',
          dhLivraison: convertToTimestamp('2023-02-24 07:55'),
          coursierCharg: 'sebastien.lherlier@novus.fr',
          coursierLivraison: 'sebastien.lherlier@novus.fr',
          véhicule: 'GE-695-RT'
        },
        {
          id: '4',
          siteDépart: 'Laboratoire Lénisole',
          dhDépart: convertToTimestamp('2023-02-24 07:44'),
          idColis: 'ASG001570930',
          statut: 'Livré' as const,
          siteFin: 'Clinique La Jayre',
          dhLivraison: convertToTimestamp('2023-02-24 08:15'),
          coursierCharg: 'guillaume.sage@novus.fr',
          coursierLivraison: 'guillaume.sage@novus.fr',
          véhicule: 'GI-456-AD'
        },
        {
          id: '5',
          siteDépart: 'Hôpital Fontroide',
          dhDépart: convertToTimestamp('2023-02-24 07:47'),
          idColis: 'ASG001524765',
          statut: 'Livré' as const,
          siteFin: 'Laboratoire Central',
          dhLivraison: convertToTimestamp('2023-02-24 08:35'),
          coursierCharg: 'sebastien.lherlier@novus.fr',
          coursierLivraison: 'sebastien.lherlier@novus.fr',
          véhicule: 'GE-695-RT'
        },
        {
          id: '6',
          siteDépart: 'Clinique STER',
          dhDépart: convertToTimestamp('2023-02-24 08:03'),
          idColis: 'ASG001570783',
          statut: 'En cours' as const,
          coursierCharg: 'sebastien.lherlier@novus.fr',
          véhicule: 'GE-695-RT'
        },
        {
          id: '7',
          siteDépart: 'Centre Beau Soleil',
          dhDépart: convertToTimestamp('2023-02-24 08:16'),
          idColis: 'MB0004040047',
          statut: 'En cours' as const,
          coursierCharg: 'michel.roude@novus.fr',
          véhicule: 'GL-789-BA'
        },
        {
          id: '8',
          siteDépart: 'Laboratoire Purpan',
          dhDépart: convertToTimestamp('2023-02-24 08:25'),
          idColis: 'ASG001578924',
          statut: 'En cours' as const,
          coursierCharg: 'guillaume.sage@novus.fr',
          véhicule: 'GI-456-AD'
        },
        {
          id: '9',
          siteDépart: 'Clinique Pasteur',
          dhDépart: convertToTimestamp('2023-02-24 07:10'),
          idColis: '30072001587',
          statut: 'Livré' as const,
          siteFin: 'Laboratoire Central',
          dhLivraison: convertToTimestamp('2023-02-24 07:55'),
          coursierCharg: 'jean.dupont@novus.fr',
          coursierLivraison: 'jean.dupont@novus.fr',
          véhicule: 'GB-123-AZ'
        },
        {
          id: '10',
          siteDépart: 'Cabinet Médical Basso',
          dhDépart: convertToTimestamp('2023-02-24 08:30'),
          idColis: 'MB0004042187',
          statut: 'En cours' as const,
          coursierCharg: 'michel.roude@novus.fr',
          véhicule: 'GL-789-BA'
        }
      ];
      
      setPassages(mockPassages);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des passages:', error);
      setError('Erreur lors de la récupération des données');
      setLoading(false);
    }
  };

  function convertToTimestamp(dateTimeString: string): Timestamp {
    const [datePart, timePart] = dateTimeString.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    
    const date = new Date(year, month - 1, day, hour, minute);
    return Timestamp.fromDate(date);
  }

  const formatDateTime = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateDisplay = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTimeDisplay = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSearch = () => {
    // Implémenter la logique de filtrage
    console.log('Recherche avec les filtres:', {
      dateDebut,
      dateFin,
      tournée,
      statut,
      site,
      véhicule,
      idColis
    });
    
    // Pour la démonstration, nous allons juste recharger les données
    fetchPassages();
  };

  const handleEdit = (passage: Passage) => {
    console.log('Modifier le passage:', passage);
    // Implémentation à venir
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce passage ?')) {
      console.log('Supprimer le passage avec ID:', id);
      // Implémentation à venir
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des passages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button className="button" onClick={fetchPassages}>Réessayer</button>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Passages</h2>
      </div>
      
      <div className="search-container">
        <input
          type="date"
          className="date-input"
          value={dateDebut}
          onChange={(e) => setDateDebut(e.target.value)}
        />
        <input
          type="date"
          className="date-input"
          value={dateFin}
          onChange={(e) => setDateFin(e.target.value)}
        />
        <select 
          className="select-input"
          value={tournée}
          onChange={(e) => setTournée(e.target.value)}
        >
          <option value="">Tournée</option>
          <option value="matin">Matin</option>
          <option value="jour">Jour</option>
          <option value="soir">Soir</option>
        </select>
        <select 
          className="select-input"
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
        >
          <option value="">Statut</option>
          <option value="Livré">Livré</option>
          <option value="En cours">En cours</option>
        </select>
        <select 
          className="select-input"
          value={site}
          onChange={(e) => setSite(e.target.value)}
        >
          <option value="">Site</option>
          <option value="Laboratoire Central">Laboratoire Central</option>
          <option value="Clinique SUB">Clinique SUB</option>
          <option value="Clinique Saint-Jean">Clinique Saint-Jean</option>
        </select>
        <select 
          className="select-input"
          value={véhicule}
          onChange={(e) => setVéhicule(e.target.value)}
        >
          <option value="">Véhicule</option>
          <option value="GE-695-RT">GE-695-RT</option>
          <option value="GI-456-AD">GI-456-AD</option>
          <option value="GL-789-BA">GL-789-BA</option>
        </select>
        <input
          type="text"
          className="text-input"
          placeholder="ID Colis"
          value={idColis}
          onChange={(e) => setIdColis(e.target.value)}
        />
        <button className="search-button" onClick={handleSearch}>
          <i className="fas fa-search"></i>
        </button>
      </div>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Site départ</th>
              <th>DH départ</th>
              <th>ID Colis</th>
              <th>Statut</th>
              <th>Site fin</th>
              <th>DH Livraison</th>
              <th>Coursier Charg.</th>
              <th>Coursier Livraison</th>
              <th>Véhicule</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {passages.map((passage) => (
              <tr key={passage.id}>
                <td>{passage.siteDépart}</td>
                <td>{formatTimeDisplay(passage.dhDépart)}</td>
                <td>{passage.idColis}</td>
                <td>
                  <span className={passage.statut === 'Livré' ? 'livré' : 'en-cours'}>
                    {passage.statut}
                  </span>
                </td>
                <td>{passage.siteFin || ''}</td>
                <td>{passage.dhLivraison ? formatTimeDisplay(passage.dhLivraison) : ''}</td>
                <td>{passage.coursierCharg || ''}</td>
                <td>{passage.coursierLivraison || ''}</td>
                <td>{passage.véhicule || ''}</td>
                <td>
                  <div className="table-actions">
                    <button 
                      onClick={() => handleEdit(passage)} 
                      className="button button-secondary edit-button"
                    >
                      <i className="fas fa-edit"></i> Modifier
                    </button>
                    <button 
                      onClick={() => handleDelete(passage.id)} 
                      className="button button-danger delete-button"
                    >
                      <i className="fas fa-trash-alt"></i> Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Passages;