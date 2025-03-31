import React from 'react';
import { Link } from 'react-router-dom';
import './MapWidget.css';

const MapWidget: React.FC = () => {
  return (
    <div className="map-widget-container">
      <div className="map-widget-header">
        <h2>Carte des coursiers</h2>
        <div className="map-widget-actions">
          <Link to="/map" className="view-full-map-button">
            Voir la carte
          </Link>
        </div>
      </div>
      
      <div className="map-widget-placeholder">
        <div className="map-widget-message">
          <p>Cliquez sur "Voir la carte" pour accéder à la carte complète des coursiers en temps réel.</p>
        </div>
      </div>
    </div>
  );
};

export default MapWidget; 
