import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  getAuth
} from 'firebase/auth';
import { auth } from '../config/firebase';

export const authDebug = {
  async debugSignIn(email: string, password: string) {
    try {
      console.log('Tentative de connexion:', { email });
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('Détails de connexion:', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        emailVerified: userCredential.user.emailVerified
      });

      return userCredential.user;
    } catch (error: any) {
      console.error('Détails complets de l\'erreur:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  },

  async createTestUser(email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      console.log('Utilisateur de test créé:', {
        uid: userCredential.user.uid,
        email: userCredential.user.email
      });

      return userCredential.user;
    } catch (error: any) {
      console.error('Erreur de création d\'utilisateur:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
  }
}; 
