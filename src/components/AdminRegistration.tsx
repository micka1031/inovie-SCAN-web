import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User } from '../types';
import './LoginScreen.css';

interface AdminRegistrationProps {
  onRegistration: (user: User) => void;
}

const AdminRegistration: React.FC<AdminRegistrationProps> = ({ onRegistration }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [pole, setPole] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Créer l'utilisateur dans Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Mettre à jour le profil Firebase
      await updateProfile(firebaseUser, {
        displayName: `${prenom} ${nom}`
      });

      // Créer le document utilisateur dans Firestore
      const newUser: Omit<User, "id"> = {
        email,
        nom,
        prenom,
        role: 'Administrateur',
        pole,
        dateCreation: new Date().toISOString(),
        dernierAcces: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);

      const user = {
        id: firebaseUser.uid,
        ...newUser
      };
      
      onRegistration(user);
    } catch (error: any) {
      let errorMessage = 'Une erreur est survenue lors de la création du compte';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Cet email est déjà utilisé';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Le mot de passe est trop faible';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email invalide';
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Création Compte Administrateur</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label htmlFor="nom">Nom</label>
            <input
              type="text"
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="prenom">Prénom</label>
            <input
              type="text"
              id="prenom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="pole">Pôle</label>
            <input
              type="text"
              id="pole"
              value={pole}
              onChange={(e) => setPole(e.target.value)}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Création en cours...' : 'Créer le compte'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminRegistration;