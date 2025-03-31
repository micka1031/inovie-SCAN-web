import { initializePassagesCollection } from '../utils/initializeFirebase';

// Fonction principale pour initialiser la collection passages
async function main() {
  console.log('Démarrage de l\'initialisation de la collection passages...');
  
  try {
    const result = await initializePassagesCollection();
    
    if (result) {
      console.log('La collection passages a été initialisée avec succès.');
    } else {
      console.log('La collection passages contient déjà des données ou une erreur s\'est produite.');
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la collection passages:', error);
  }
}

// Exécuter la fonction principale
main();

