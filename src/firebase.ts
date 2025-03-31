// Re-export pour compatibilité
import { db, storage, auth, PRODUCTION_URL, actionCodeSettings, ALLOWED_DOMAINS, handleFirebaseError } from './config/firebase';

export { 
  db, 
  storage, 
  auth,
  PRODUCTION_URL,
  actionCodeSettings,
  ALLOWED_DOMAINS,
  handleFirebaseError
}; 