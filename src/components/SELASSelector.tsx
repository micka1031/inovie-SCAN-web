import React, { useEffect, useState } from 'react';
import { Select, Spin, Button, Modal, message } from 'antd';
import { useSelasContext } from '../contexts/SelasContext';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, writeBatch, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import './SELASSelector.css';

const SelasSelector: React.FC = () => {
  const { currentSelasId, setCurrentSelasId, availableSelas, loading } = useSelasContext();
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [migrationResult, setMigrationResult] = useState<string>('');
  const [showMigrationModal, setShowMigrationModal] = useState<boolean>(false);
  
  // Débogage - Afficher l'état du sélecteur de SELAS
  useEffect(() => {
    console.log('🏢 SelasSelector - État:', {
      currentSelasId,
      availableSelasCount: availableSelas.length,
      availableSelas,
      loading
    });
  }, [currentSelasId, availableSelas, loading]);
  
  const handleSelasChange = (selasId: string) => {
    if (selasId === currentSelasId) return;
    
    if (window.confirm("Changer de SELAS va recharger toutes les données. Voulez-vous continuer ?")) {
      console.log(`🔄 Changement de SELAS demandé: ${selasId}`);
      setCurrentSelasId(selasId);
      
      // Recharger la page pour actualiser toutes les données
      setTimeout(() => {
        window.location.reload();
      }, 300); // Petit délai pour permettre à localStorage d'être mis à jour
    }
  };
  
  // Vérifier si l'utilisateur est administrateur
  const isAdmin = () => {
    const auth = getAuth();
    const user = auth.currentUser;
    // Vous pouvez ajouter votre propre logique pour vérifier si l'utilisateur est un administrateur
    return !!user; // Pour l'instant, tous les utilisateurs connectés sont considérés comme administrateurs
  };
  
  // Fonction pour migrer les données
  const migrateData = async () => {
    if (!currentSelasId) {
      message.error('Aucune SELAS sélectionnée');
      return;
    }
    
    try {
      setIsMigrating(true);
      setMigrationResult('');
      setShowMigrationModal(true);
      
      const collections = [
        'passages',
        'sites',
        'tournees',
        'vehicules',
        'users',
        'markerPreferences'
      ];
      
      let totalUpdated = 0;
      
      for (const collectionName of collections) {
        const result = await processBatch(collectionName, currentSelasId);
        totalUpdated += result;
      }
      
      setMigrationResult(`✅ Migration terminée ! ${totalUpdated} documents mis à jour.`);
      message.success(`Migration terminée! ${totalUpdated} documents mis à jour.`);
    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error);
      setMigrationResult(`❌ Erreur lors de la migration: ${error}`);
      message.error(`Erreur lors de la migration: ${error}`);
    } finally {
      setIsMigrating(false);
    }
  };
  
  // Fonction pour traiter une collection par lots
  const processBatch = async (collectionName: string, selasId: string, batchSize = 200) => {
    const results = [];
    
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(query(collectionRef, limit(batchSize)));
      
      if (snapshot.empty) {
        results.push(`ℹ️ Aucun document trouvé dans ${collectionName}`);
        return 0;
      }
      
      let count = 0;
      const batch = writeBatch(db);
      
      for (const docSnapshot of snapshot.docs) {
        const docRef = doc(db, collectionName, docSnapshot.id);
        const data = docSnapshot.data();
        
        // Vérifier si le document a déjà un selasId
        if (!data.selasId) {
          batch.update(docRef, { selasId: selasId });
          count++;
        }
      }
      
      // Commit le lot
      if (count > 0) {
        await batch.commit();
        results.push(`✅ ${count} documents mis à jour dans ${collectionName}`);
      } else {
        results.push(`ℹ️ Aucune mise à jour nécessaire pour ${collectionName}`);
      }
      
      // Mettre à jour le résultat de la migration
      setMigrationResult(prev => prev + '\n' + results.join('\n'));
      
      return count;
    } catch (error) {
      results.push(`❌ Erreur lors du traitement de ${collectionName}: ${error}`);
      setMigrationResult(prev => prev + '\n' + results.join('\n'));
      console.error(`Erreur lors du traitement de ${collectionName}:`, error);
      return 0;
    }
  };
  
  if (loading) {
    return (
      <div className="selas-selector">
        <Spin size="small" />
      </div>
    );
  }
  
  // Afficher même s'il n'y a qu'une seule SELAS
  // if (availableSelas.length <= 1) {
  //   return null; // Ne pas afficher le sélecteur s'il n'y a qu'une seule SELAS
  // }
  
  // Cas où aucune SELAS n'est disponible
  if (availableSelas.length === 0) {
    console.warn('⚠️ Aucune SELAS disponible!');
    return (
      <div className="selas-selector error">
        <span className="selas-label">SELAS:</span>
        <span className="selas-error">Aucune SELAS disponible</span>
      </div>
    );
  }
  
  return (
    <div className="selas-selector">
      <span className="selas-label">SELAS:</span>
      <Select
        value={currentSelasId || undefined}
        onChange={handleSelasChange}
        options={availableSelas.map(selas => ({
          value: selas.id,
          label: selas.nom
        }))}
        placeholder="Sélectionner une SELAS"
        style={{ width: 200 }}
      />
      
      {isAdmin() && (
        <Button 
          type="primary" 
          size="small" 
          onClick={migrateData} 
          loading={isMigrating}
          className="migration-button"
        >
          Migrer les données
        </Button>
      )}
      
      <Modal
        title="Migration des données"
        open={showMigrationModal}
        onCancel={() => setShowMigrationModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowMigrationModal(false)}>
            Fermer
          </Button>
        ]}
      >
        <div className="migration-log">
          {migrationResult ? (
            <pre>{migrationResult}</pre>
          ) : (
            <Spin tip="Migration en cours..." />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default SelasSelector; 