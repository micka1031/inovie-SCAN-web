import React, { useState } from 'react';
import { Vehicule } from '../types';
import './DataTable.css';

interface VehiculesTableProps {
  vehicules: Vehicule[];
}

const VehiculesTable: React.FC<VehiculesTableProps> = ({ vehicules }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [marqueFilter, setMarqueFilter] = useState('');
  
  // Filtrer les véhicules
  const filteredVehicules = vehicules.filter(vehicule => {
    const matchesSearch = 
      vehicule.immatriculation.toLowerCase().includes(searchTerm.toLowerCase()) || 
      vehicule.marque.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicule.modele.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMarque = marqueFilter ? vehicule.marque === marqueFilter : true;
    
    return matchesSearch && matchesMarque;
  });
  
  // Obtenir les marques uniques
  const marques = Array.from(new Set(vehicules.map(v => v.marque)));
  
  return (
    <div className="table-container">
      <div className="section-header">
        <h2 className="section-title">Véhicules</h2>
      </div>
      
      <div className="filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Rechercher par immatriculation, marque ou modèle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>
        
        <div className="filter-group">
          <select
            value={marqueFilter}
            onChange={(e) => setMarqueFilter(e.target.value)}
            className="filter-select"
            title="Filtrer par marque"
          >
            <option value="">Toutes les marques</option>
            {marques.map(marque => (
              <option key={marque} value={marque}>{marque}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Immatriculation</th>
              <th>Marque</th>
              <th>Modèle</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicules.map(vehicule => (
              <tr key={vehicule.id}>
                <td>{vehicule.immatriculation}</td>
                <td>{vehicule.marque}</td>
                <td>{vehicule.modele}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VehiculesTable;
