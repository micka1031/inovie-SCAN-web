import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Pôles de démonstration
const demoPoles = [
  {
    nom: "Pôle Nord",
    description: "Secteur nord de la ville",
    dateCreation: new Date().toISOString(),
    dateModification: new Date().toISOString()
  },
  {
    nom: "Pôle Sud",
    description: "Secteur sud de la ville",
    dateCreation: new Date().toISOString(),
    dateModification: new Date().toISOString()
  },
  {
    nom: "Pôle Est",
    description: "Secteur est de la ville",
    dateCreation: new Date().toISOString(),
    dateModification: new Date().toISOString()
  },
  {
    nom: "Pôle Ouest",
    description: "Secteur ouest de la ville",
    dateCreation: new Date().toISOString(),
    dateModification: new Date().toISOString()
  },
  {
    nom: "Pôle Central",
    description: "Centre-ville",
    dateCreation: new Date().toISOString(),
    dateModification: new Date().toISOString()
  }
];

/**
 * Initialise la collection de pôles avec des données de démonstration
 * si la collection est vide
 */
export const initPolesCollection = async (): Promise<void> => {
  try {
    // Vérifier si la collection existe et contient des données
    const polesRef = collection(db, 'poles');
    const snapshot = await getDocs(polesRef);
    
    // Si la collection est vide, ajouter les pôles de démonstration
    if (snapshot.empty) {
      console.log('Initialisation de la collection des pôles...');
      
      for (const pole of demoPoles) {
        await addDoc(polesRef, pole);
      }
      
      console.log('Collection des pôles initialisée avec succès');
    } else {
      console.log(`La collection des pôles contient déjà ${snapshot.size} documents`);
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des pôles:', error);
  }
}; 