// Script pour initialiser la collection passages dans Firebase
import { db } from '../config/firebase';
import { collection, getDocs, addDoc, Timestamp, deleteDoc } from 'firebase/firestore';

// Fonction pour convertir une chaîne de date et heure en Timestamp
function convertToTimestamp(dateTimeString) {
    const [datePart, timePart] = dateTimeString.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    
    const date = new Date(year, month - 1, day, hour, minute);
    return Timestamp.fromDate(date);
}

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

// Fonction pour vérifier si une collection existe et contient des données
export async function collectionHasData(collectionName) {
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        return !querySnapshot.empty;
    } catch (error) {
        console.error(`Erreur lors de la vérification de la collection ${collectionName}:`, error);
        throw error; // Propager l'erreur pour une meilleure gestion
    }
}

// Fonction pour initialiser la collection passages
export async function initializePassagesCollection(forceInitialization = true) {
    try {
        // Vérifier si la collection existe déjà
        const passagesRef = collection(db, 'passages');
        const querySnapshot = await getDocs(passagesRef);
        
        // Si forceInitialization est true, on supprime les documents existants
        if (!querySnapshot.empty && forceInitialization) {
            console.log(`Suppression des ${querySnapshot.size} documents existants...`);
            
            // Supprimer tous les documents existants
            const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
            
            console.log('Tous les documents ont été supprimés avec succès.');
        } else if (!querySnapshot.empty) {
            console.log(`La collection passages contient déjà ${querySnapshot.size} documents. Aucune initialisation nécessaire.`);
            return false;
        }
        
        // Initialiser la collection avec les nouvelles données
        let addedCount = 0;
        
        for (const passage of initialPassages) {
            await addDoc(passagesRef, passage);
            addedCount++;
        }
        
        console.log(`Initialisation réussie ! ${addedCount} passages ont été ajoutés à la collection.`);
        return true;
        
    } catch (error) {
        console.error('Erreur détaillée lors de l\'initialisation de la collection passages:', error);
        throw error; // Propager l'erreur pour une meilleure gestion
    }
}
