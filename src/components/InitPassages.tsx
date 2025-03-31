import React, { useState } from 'react';
import { initializePassagesCollection } from '../scripts/initPassagesFirebase';

const InitPassages: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [forceInit, setForceInit] = useState(true);

  const handleInitialize = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const success = await initializePassagesCollection(forceInit);
      
      if (success) {
        setResult({
          success: true,
          message: 'La collection passages a été initialisée avec succès !'
        });
      } else {
        setResult({
          success: false,
          message: 'La collection passages contient déjà des données et l\'option "Forcer l\'initialisation" est désactivée.'
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      setResult({
        success: false,
        message: `Erreur lors de l'initialisation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Initialisation de la Collection Passages</h2>
      
      <p style={{ marginBottom: '20px' }}>
        Cliquez sur le bouton ci-dessous pour initialiser la collection "passages" dans Firebase avec des données fictives.
      </p>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={forceInit}
            onChange={(e) => setForceInit(e.target.checked)}
            style={{ marginRight: '10px' }}
          />
          Forcer l'initialisation (supprime les données existantes)
        </label>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '5px', marginLeft: '25px' }}>
          Si cette option est activée, les données existantes seront supprimées avant d'ajouter les nouvelles.
        </p>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <button
          onClick={handleInitialize}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {loading ? 'Initialisation en cours...' : 'Initialiser la Collection Passages'}
        </button>
      </div>
      
      {result && (
        <div
          style={{
            padding: '15px',
            backgroundColor: result.success ? '#dff0d8' : '#f2dede',
            color: result.success ? '#3c763d' : '#a94442',
            borderRadius: '4px',
            marginTop: '20px'
          }}
        >
          {result.message}
        </div>
      )}
    </div>
  );
};

export default InitPassages;

