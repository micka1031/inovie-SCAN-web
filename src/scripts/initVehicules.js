// Script pour initialiser les véhicules dans Firestore
import vehicleService from '../services/vehicleService';
import { db } from '../config/firebase';
import { getDocs, deleteDoc, doc, collection } from 'firebase/firestore';

// Initialiser les véhicules par défaut
const initVehicules = async () => {
  try {
    console.log('Démarrage de l\'initialisation des véhicules...');
    await vehicleService.initializeDefaultVehicles();
    console.log('Initialisation terminée avec succès!');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    throw error;
  }
};

// Fonction pour réinitialiser complètement la collection (effacer tout et recréer)
const resetVehicules = async () => {
  try {
    console.log('Suppression de tous les véhicules existants...');
    
    // Récupérer tous les documents
    const snapshot = await getDocs(collection(db, 'vehicules'));
    
    // Supprimer chaque document
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`${snapshot.docs.length} véhicules supprimés`);
    
    // Initialiser avec les données par défaut
    await vehicleService.initializeDefaultVehicles();
    
    console.log('Réinitialisation terminée avec succès!');
    return snapshot.docs.length;
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    throw error;
  }
};

// Exporter la fonction pour l'utiliser dans l'application
export default initVehicules;
export { resetVehicules }; 