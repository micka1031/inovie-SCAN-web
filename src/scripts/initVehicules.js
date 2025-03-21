// Script pour initialiser les véhicules dans Firestore
import vehicleService from '../services/vehicleService';

// Initialiser les véhicules par défaut
const initVehicules = async () => {
  try {
    console.log('Démarrage de l\'initialisation des véhicules...');
    await vehicleService.initializeDefaultVehicles();
    console.log('Initialisation terminée avec succès!');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
  }
};

// Exporter la fonction pour l'utiliser dans l'application
export default initVehicules; 