import { db } from '../config/firebase';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { auth } from '../config/firebase';
import { FirebaseError } from 'firebase/app';

// Fonction pour vérifier si une collection existe et contient des données
const collectionHasData = async (collectionName: string): Promise<boolean> => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return !querySnapshot.empty;
  } catch (error) {
    console.error(`Erreur lors de la vérification de la collection ${collectionName}:`, error);
    return false;
  }
};

// Fonction pour convertir une chaîne de date et heure en Timestamp
function convertToTimestamp(dateTimeString: string): Timestamp {
  const [datePart, timePart] = dateTimeString.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  
  const date = new Date(year, month - 1, day, hour, minute);
  return Timestamp.fromDate(date);
}

// Données initiales pour les véhicules
const initialVehicules = [
  {
    immatriculation: 'GE-695-RT',
    marque: 'Renault',
    modele: 'Kangoo',
    type: 'Utilitaire',
    annee: 2020,
    statut: 'actif',
    dernierEntretien: '2023-01-15',
    coursierAssigne: 'Sébastien Lherlier',
    kilometrage: 45000
  },
  {
    immatriculation: 'GI-456-AD',
    marque: 'Citroën',
    modele: 'Berlingo',
    type: 'Utilitaire',
    annee: 2021,
    statut: 'actif',
    dernierEntretien: '2023-02-10',
    coursierAssigne: 'Guillaume Sage',
    kilometrage: 32500
  },
  {
    immatriculation: 'GL-789-BA',
    marque: 'Renault',
    modele: 'Clio',
    type: 'Voiture',
    annee: 2022,
    statut: 'actif',
    dernierEntretien: '2023-02-20',
    coursierAssigne: 'Michel Roude',
    kilometrage: 15800
  },
  {
    immatriculation: 'GB-123-AZ',
    marque: 'Peugeot',
    modele: '208',
    type: 'Voiture',
    annee: 2021,
    statut: 'actif',
    dernierEntretien: '2023-01-05',
    coursierAssigne: 'Jean Dupont',
    kilometrage: 28600
  }
];

// Données initiales pour les tournées
const initialTournees = [
  {
    nom: 'Tournée Matin Est',
    date: Timestamp.fromDate(new Date()),
    heureDepart: '07:00',
    heureFinPrevue: '12:00',
    heureFinReelle: '11:45',
    coursier: 'Sébastien Lherlier',
    vehicule: 'GE-695-RT',
    nombreColis: 15,
    statut: 'terminee',
    siteDepart: 'Laboratoire Central'
  },
  {
    nom: 'Tournée Matin Ouest',
    date: Timestamp.fromDate(new Date()),
    heureDepart: '07:30',
    heureFinPrevue: '12:30',
    heureFinReelle: '12:15',
    coursier: 'Guillaume Sage',
    vehicule: 'GI-456-AD',
    nombreColis: 12,
    statut: 'terminee',
    siteDepart: 'Laboratoire Purpan'
  },
  {
    nom: 'Tournée Après-midi Est',
    date: Timestamp.fromDate(new Date()),
    heureDepart: '13:00',
    heureFinPrevue: '18:00',
    coursier: 'Sébastien Lherlier',
    vehicule: 'GE-695-RT',
    nombreColis: 10,
    statut: 'en_cours',
    siteDepart: 'Laboratoire Central'
  }
];

// Données initiales pour les sites
const initialSites = [
  {
    nom: 'Laboratoire Central',
    adresse: '15 rue des Sciences',
    ville: 'Toulouse',
    codePostal: '31000',
    telephone: '05.61.22.33.44',
    email: 'labo.central@inovie.fr',
    type: 'Laboratoire',
    statut: 'actif'
  },
  {
    nom: 'Clinique SUB',
    adresse: '25 avenue de la Santé',
    ville: 'Toulouse',
    codePostal: '31400',
    telephone: '05.61.33.44.55',
    email: 'clinique.sub@inovie.fr',
    type: 'Clinique',
    statut: 'actif'
  },
  {
    nom: 'Laboratoire Purpan',
    adresse: '2 avenue de Purpan',
    ville: 'Toulouse',
    codePostal: '31300',
    telephone: '05.61.66.77.88',
    email: 'labo.purpan@inovie.fr',
    type: 'Laboratoire',
    statut: 'actif'
  }
];

// Données initiales pour les passages
const initialPassages = [
  {
    siteDépart: 'Laboratoire Bonnefoy',
    dhDépart: convertToTimestamp('2023-02-24 07:25'),
    idColis: '30072001529',
    statut: 'Livré',
    siteFin: 'Clinique SUB',
    dhLivraison: convertToTimestamp('2023-02-24 08:40'),
    coursierCharg: 'sebastien.lherlier@novus.fr',
    coursierLivraison: 'sebastien.lherlier@novus.fr',
    véhicule: 'GE-695-RT'
  },
  {
    siteDépart: 'Clinique Saint-Jean',
    dhDépart: convertToTimestamp('2023-02-24 07:15'),
    idColis: '15000434563',
    statut: 'Livré',
    siteFin: 'Laboratoire Central',
    dhLivraison: convertToTimestamp('2023-02-24 08:10'),
    coursierCharg: 'sebastien.lherlier@novus.fr',
    coursierLivraison: 'sebastien.lherlier@novus.fr',
    véhicule: 'GE-695-RT'
  },
  {
    siteDépart: 'Centre Médical Rangueil',
    dhDépart: convertToTimestamp('2023-02-24 07:05'),
    idColis: '15000199845',
    statut: 'Livré',
    siteFin: 'Laboratoire Central',
    dhLivraison: convertToTimestamp('2023-02-24 07:55'),
    coursierCharg: 'sebastien.lherlier@novus.fr',
    coursierLivraison: 'sebastien.lherlier@novus.fr',
    véhicule: 'GE-695-RT'
  },
  {
    siteDépart: 'Laboratoire Lénisole',
    dhDépart: convertToTimestamp('2023-02-24 07:44'),
    idColis: 'ASG001570930',
    statut: 'Livré',
    siteFin: 'Clinique La Jayre',
    dhLivraison: convertToTimestamp('2023-02-24 08:15'),
    coursierCharg: 'guillaume.sage@novus.fr',
    coursierLivraison: 'guillaume.sage@novus.fr',
    véhicule: 'GI-456-AD'
  },
  {
    siteDépart: 'Hôpital Fontroide',
    dhDépart: convertToTimestamp('2023-02-24 07:47'),
    idColis: 'ASG001524765',
    statut: 'Livré',
    siteFin: 'Laboratoire Central',
    dhLivraison: convertToTimestamp('2023-02-24 08:35'),
    coursierCharg: 'sebastien.lherlier@novus.fr',
    coursierLivraison: 'sebastien.lherlier@novus.fr',
    véhicule: 'GE-695-RT'
  },
  {
    siteDépart: 'Clinique STER',
    dhDépart: convertToTimestamp('2023-02-24 08:03'),
    idColis: 'ASG001570783',
    statut: 'En cours',
    coursierCharg: 'sebastien.lherlier@novus.fr',
    véhicule: 'GE-695-RT'
  },
  {
    siteDépart: 'Centre Beau Soleil',
    dhDépart: convertToTimestamp('2023-02-24 08:16'),
    idColis: 'MB0004040047',
    statut: 'En cours',
    coursierCharg: 'michel.roude@novus.fr',
    véhicule: 'GL-789-BA'
  },
  {
    siteDépart: 'Laboratoire Purpan',
    dhDépart: convertToTimestamp('2023-02-24 08:25'),
    idColis: 'ASG001578924',
    statut: 'En cours',
    coursierCharg: 'guillaume.sage@novus.fr',
    véhicule: 'GI-456-AD'
  },
  {
    siteDépart: 'Clinique Pasteur',
    dhDépart: convertToTimestamp('2023-02-24 07:10'),
    idColis: '30072001587',
    statut: 'Livré',
    siteFin: 'Laboratoire Central',
    dhLivraison: convertToTimestamp('2023-02-24 07:55'),
    coursierCharg: 'jean.dupont@novus.fr',
    coursierLivraison: 'jean.dupont@novus.fr',
    véhicule: 'GB-123-AZ'
  },
  {
    siteDépart: 'Cabinet Médical Basso',
    dhDépart: convertToTimestamp('2023-02-24 08:30'),
    idColis: 'MB0004042187',
    statut: 'En cours',
    coursierCharg: 'michel.roude@novus.fr',
    véhicule: 'GL-789-BA'
  }
];

// Fonction pour initialiser une collection avec des données
const initializeCollection = async (collectionName: string, initialData: any[]) => {
  try {
    // Vérifier si l'utilisateur est authentifié
    const currentUser = auth.currentUser;
    console.log(`Tentative d'initialisation de ${collectionName}`);
    console.log('Utilisateur actuel:', currentUser ? currentUser.uid : 'Non authentifié');

    if (!currentUser) {
      console.error(`Impossible d'initialiser ${collectionName}: Utilisateur non authentifié`);
      return false;
    }

    // Obtenir le token d'authentification
    const token = await currentUser.getIdToken();
    console.log('Token obtenu:', token ? 'Oui' : 'Non');

    const hasData = await collectionHasData(collectionName);
    
    if (!hasData) {
      console.log(`Initialisation de la collection ${collectionName}...`);
      const collectionRef = collection(db, collectionName);
      
      for (const item of initialData) {
        try {
          await addDoc(collectionRef, item);
          console.log(`Document ajouté à ${collectionName}`);
        } catch (addError) {
          console.error(`Erreur lors de l'ajout d'un document à ${collectionName}:`, addError);
        }
      }
      
      console.log(`Collection ${collectionName} initialisée avec succès.`);
      return true;
    } else {
      console.log(`La collection ${collectionName} contient déjà des données.`);
      return true;
    }
  } catch (error) {
    console.error(`Erreur détaillée lors de l'initialisation de la collection ${collectionName}:`, error);
    
    // Analyse détaillée de l'erreur
    if (error instanceof FirebaseError) {
      console.error('Code d\'erreur Firebase:', error.code);
      console.error('Message d\'erreur:', error.message);
    }
    
    return false;
  }
};

// Fonction pour initialiser spécifiquement la collection passages (utilisée une seule fois)
export const initializePassagesCollection = async () => {
  try {
    console.log('Initialisation de la collection passages...');
    
    // Vérifier si la collection existe déjà
    const hasData = await collectionHasData('passages');
    
    if (!hasData) {
      const passagesRef = collection(db, 'passages');
      
      for (const passage of initialPassages) {
        await addDoc(passagesRef, passage);
      }
      
      console.log('Collection passages initialisée avec succès.');
      return true;
    } else {
      console.log('La collection passages contient déjà des données.');
      return false;
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la collection passages:', error);
    return false;
  }
};

// Fonction principale pour initialiser toutes les collections
export const initializeFirebaseData = async () => {
  console.log('Vérification et initialisation des collections Firebase...');
  
  await initializeCollection('vehicules', initialVehicules);
  await initializeCollection('tournees', initialTournees);
  await initializeCollection('sites', initialSites);
  await initializeCollection('passages', initialPassages);
  
  console.log('Initialisation des collections terminée.');
};

