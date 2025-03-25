// Script pour initialiser la collection passages dans Firebase
import { initializeFirebaseData } from '../utils/initializeFirebase.js';

// Fonction principale
async function main() {
  console.log('Démarrage de l\'initialisation des données Firebase...');
  
  try {
    await initializeFirebaseData();
    console.log('Initialisation terminée avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
  }
}

// Exécuter la fonction principale
main();
