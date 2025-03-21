import React, { useState } from 'react';
import { Tournee } from '../types';
import './TourneesTable.css';

interface TourneesTableProps {
  tournees: Tournee[];
}

const TourneesTable: React.FC<TourneesTableProps> = ({ tournees }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTournees = tournees.filter(tournee => {
    const searchLower = searchTerm.toLowerCase();
    return (
      tournee.nom.toLowerCase().includes(searchLower) ||
      tournee.codeBarres.toLowerCase().includes(searchLower) ||
      (tournee.personne?.toLowerCase() || '').includes(searchLower)
    );
  });

  return (
    <div className="table-container">
      <div className="section-header">
        <h2 className="section-title">Liste des Tournées</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="Rechercher une tournée..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Code-barres</th>
            <th>Pôle</th>
            <th>Véhicule</th>
            <th>Personne</th>
            <th>Date début</th>
            <th>Date fin</th>
            <th>Statut</th>
            <th>Commentaire</th>
          </tr>
        </thead>
        <tbody>
          {filteredTournees.map((tournee) => (
            <tr key={tournee.id}>
              <td>{tournee.nom}</td>
              <td>{tournee.codeBarres}</td>
              <td>{tournee.pole}</td>
              <td>{tournee.vehiculeId || '-'}</td>
              <td>{tournee.personne || '-'}</td>
              <td>{tournee.dateDebut}</td>
              <td>{tournee.dateFin || '-'}</td>
              <td>
                <span className={`status-badge ${tournee.statut.toLowerCase()}`}>
                  {tournee.statut}
                </span>
              </td>
              <td>{tournee.commentaire || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TourneesTable;
