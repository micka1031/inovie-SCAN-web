import { 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  db, 
  auth, 
  PRODUCTION_URL,
  actionCodeSettings 
} from '../config/firebase';

interface UserData {
  email: string;
  nom: string;
  role: string;
  pole: string;
  statut: string;
  [key: string]: any;
}

interface AdminCredentials {
  email: string;
  password: string;
}

interface CreateUserResult {
  success: boolean;
  uid?: string;
  docId?: string;
  error?: any;
}

/**
 * Génère un mot de passe temporaire complexe
 * Format: 2 majuscules + 2 minuscules + 2 chiffres + 1 caractère spécial
 * Exemple: AB12cd!
 */
export const generateTempPassword = (): string => {
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%&*-_=+';
  
  let password = '';
  
  // Ajouter 2 lettres majuscules
  for (let i = 0; i < 2; i++) {
    password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
  }
  
  // Ajouter 2 chiffres
  for (let i = 0; i < 2; i++) {
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  // Ajouter 2 lettres minuscules
  for (let i = 0; i < 2; i++) {
    password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
  }
  
  // Ajouter 1 caractère spécial
  password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  
  // Mélanger le mot de passe (Fisher-Yates shuffle)
  const passwordArray = password.split('');
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }
  
  return passwordArray.join('');
};

/**
 * Crée un nouvel utilisateur sans déconnecter l'administrateur actuel
 */
export const createUserWithoutSignOut = async (userData: UserData): Promise<CreateUserResult> => {
  try {
    console.log('Début de la création d\'un nouvel utilisateur:', userData.email);
    
    // Créer l'utilisateur dans Firebase Auth avec un mot de passe aléatoire
    const tempPassword = generateTempPassword();
    console.log('Mot de passe temporaire généré');
    
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, tempPassword);
    const uid = userCredential.user.uid;
    console.log('Utilisateur créé dans Firebase Auth avec UID:', uid);

    // Configuration personnalisée pour l'email de réinitialisation
    const resetActionCodeSettings = {
      // URL de redirection après la réinitialisation du mot de passe
      url: PRODUCTION_URL + `/login?email=${encodeURIComponent(userData.email)}&newUser=true&nom=${encodeURIComponent(userData.nom)}`,
      // Activer la gestion du code dans l'application
      handleCodeInApp: true
    };
    
    // Envoyer l'email de réinitialisation de mot de passe
    console.log('Envoi de l\'email de réinitialisation à:', userData.email);
    await sendPasswordResetEmail(auth, userData.email, resetActionCodeSettings);
    console.log('Email de réinitialisation envoyé avec succès');

    // Créer le document utilisateur dans Firestore
    const userDocRef = await addDoc(collection(db, 'users'), {
      ...userData,
      uid: uid,
      identifiant: uid,
      createdAt: new Date().toISOString()
    });
    console.log('Document utilisateur créé dans Firestore avec ID:', userDocRef.id);

    return {
      success: true,
      docId: userDocRef.id,
      uid: uid
    };
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    return {
      success: false,
      error: error as Error
    };
  }
}; 
