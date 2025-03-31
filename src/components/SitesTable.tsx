import React, { useState } from 'react';
import { Site } from '../types/index';
import './DataTable.css';

interface SitesTableProps {
  sites: Site[];
}

const SitesTable: React.FC<SitesTableProps> = ({ sites }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [poleFilter, setPoleFilter] = useState('');
  
  // Filtrer les sites
  const filteredSites = sites.filter(site => {
    const matchesSearch = site.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         site.codeBarres.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPole = poleFilter ? site.pole === poleFilter : true;
    
    return matchesSearch && matchesPole;
  });
  
  // Obtenir les pôles uniques
  const poles = Array.from(new Set(sites.map(s => s.pole)));
  
  return (
    <div className="table-container">
      <div className="section-header">
        <h2 className="section-title">Sites</h2>
      </div>
      
      <div className="filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Rechercher par nom ou code-barres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>
        
        <div className="filter-group">
          <label htmlFor="pole-filter">Filtrer par pôle :</label>
          <select
            id="pole-filter"
            value={poleFilter}
            onChange={(e) => setPoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Tous les pôles</option>
            {poles.map(pole => (
              <option key={pole} value={pole}>{pole}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>PÔLE</th>
              <th>NOM</th>
              <th>TYPE</th>
              <th>ADRESSE</th>
              <th>VILLE</th>
              <th>CODE POSTAL</th>
              <th>TELEPHONE</th>
              <th>EMAIL</th>
              <th>CODE-BARRE</th>
              <th>TOURNÉES</th>
              <th>CODE PORTE</th>
              <th>COORDONNÉES</th>
              <th>STATUT</th>
            </tr>
          </thead>
          <tbody>
            {filteredSites.map(site => (
              <tr key={site.id}>
                <td>{site.pole}</td>
                <td>{site.nom}</td>
                <td>{site.type}</td>
                <td>{site.adresse}</td>
                <td>{site.ville}</td>
                <td>{site.codePostal}</td>
                <td>{site.telephone || '-'}</td>
                <td>{site.email || '-'}</td>
                <td>{site.codeBarres}</td>
                <td>{site.tournees ? site.tournees.join(', ') : '-'}</td>
                <td>{site.codesPorte || '-'}</td>
                <td>{site.coordonnees || '-'}</td>
                <td>{site.statut}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SitesTable;
