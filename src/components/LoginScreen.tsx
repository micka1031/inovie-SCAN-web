import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { auth, db, PRODUCTION_URL, ALLOWED_DOMAINS, domainConfig, actionCodeSettings } from '../firebase';
import logoInovie from '../assets/logo-inovie.png';
// import * as LogoIcons from '../assets/inovie-logo.js';
import './LoginScreen.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string>('');
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [isNewUserLogin, setIsNewUserLogin] = useState<boolean>(false);
  const [isPasswordReset, setIsPasswordReset] = useState<boolean>(false);
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetEmailSent, setResetEmailSent] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();
  const { login, currentUser } = useAuth();

  // Effet pour rediriger automatiquement si l'utilisateur est connecté
  useEffect(() => {
    if (currentUser && isSubmitted) {
      console.log("Redirection automatique vers / car utilisateur connecté:", currentUser);
      navigate('/');
    }
  }, [currentUser, isSubmitted, navigate]);

  useEffect(() => {
    // Récupérer les paramètres de l'URL
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const isNewUser = params.get('newUser') === 'true';
    const isReset = params.get('reset') === 'true';
    const nom = params.get('nom');
    const role = params.get('role');

    console.log('🔍 Paramètres URL détectés:', {
      email,
      isNewUser,
      isReset,
      nom,
      role,
      fullUrl: window.location.href
    });

    // Pré-remplir l'email s'il est présent dans l'URL
    if (email) {
      setIdentifier(email);
      console.log('📝 Email pré-rempli:', email);
    }

    // Afficher un message approprié selon le scénario
    if (isNewUser && nom) {
      setIsNewUserLogin(true);
      const welcomeMsg = `Bienvenue ${nom} ! Votre compte a été créé avec succès. Veuillez vous connecter avec le mot de passe que vous venez de définir.`;
      setWelcomeMessage(welcomeMsg);
      setInfoMessage("Si vous n'avez pas encore défini votre mot de passe via l'email, vous pouvez également utiliser le mot de passe temporaire fourni par votre administrateur.");
      console.log('✨ Message de bienvenue affiché pour nouvel utilisateur:', welcomeMsg);
    } else if (isReset) {
      setIsPasswordReset(true);
      const resetMsg = "Votre mot de passe a été réinitialisé avec succès !";
      setWelcomeMessage(resetMsg);
      setInfoMessage("Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.");
      console.log('🔄 Message de réinitialisation affiché:', resetMsg);
    } else {
      console.log('ℹ️ Aucun message spécial à afficher');
    }
  }, []);

  // Fonction pour trouver l'email d'un utilisateur à partir de son identifiant
  const findEmailByIdentifier = async (userIdentifier: string): Promise<string | null> => {
    try {
      // Si l'identifiant contient déjà un @, c'est probablement un email
      if (userIdentifier.includes('@')) {
        console.log(`📧 Identifiant contient déjà un @ - utilisation directe: ${userIdentifier}`);
        return userIdentifier;
      }
      
      console.log(`🔍 Recherche de l'utilisateur avec l'identifiant exact: "${userIdentifier}"`);
      
      // Récupérer tous les utilisateurs pour déboguer
      const allUsersRef = collection(db, 'users');
      const allUsersSnapshot = await getDocs(allUsersRef);
      console.log(`📊 Nombre total d'utilisateurs dans Firestore: ${allUsersSnapshot.size}`);
      
      // Afficher les premiers utilisateurs pour déboguer
      const sampleUsers = allUsersSnapshot.docs.slice(0, 3).map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          identifiant: data.identifiant,
          email: data.email
        };
      });
      console.log('📋 Échantillon d\'utilisateurs:', sampleUsers);
      
      // Rechercher l'utilisateur dans Firestore par son identifiant (recherche exacte)
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('identifiant', '==', userIdentifier));
      const querySnapshot = await getDocs(q);
      
      // Si aucun résultat, essayer avec une recherche insensible à la casse
      if (querySnapshot.empty) {
        console.log(`⚠️ Aucun utilisateur trouvé avec l'identifiant exact: "${userIdentifier}"`);
        console.log(`🔄 Recherche manuelle insensible à la casse...`);
        
        // Recherche manuelle insensible à la casse
        const userIdentifierLower = userIdentifier.toLowerCase();
        
        // Parcourir tous les utilisateurs pour trouver une correspondance insensible à la casse
        for (const doc of allUsersSnapshot.docs) {
          const userData = doc.data();
          if (userData.identifiant && userData.identifiant.toLowerCase() === userIdentifierLower) {
            console.log(`✅ Utilisateur trouvé avec correspondance insensible à la casse: "${userData.identifiant}"`);
            if (userData.email) {
              console.log(`📧 Email trouvé: ${userData.email}`);
              return userData.email;
            }
          }
        }
        
        // Si toujours pas trouvé, essayer avec @inovie.fr
        console.log(`⚠️ Aucune correspondance trouvée, essai avec @inovie.fr`);
        const emailWithDomain = `${userIdentifier}@inovie.fr`;
        console.log(`📧 Email construit: ${emailWithDomain}`);
        return emailWithDomain;
      }
      
      // Récupérer l'email du premier utilisateur trouvé
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const email = userData.email;
      
      console.log(`✅ Utilisateur trouvé: "${userIdentifier}" -> "${email}"`);
      console.log(`📊 Données complètes:`, userData);
      
      return email;
    } catch (error) {
      console.error('❌ Erreur lors de la recherche de l\'utilisateur:', error);
      // En cas d'erreur, essayer avec @inovie.fr comme solution de secours
      const emailWithDomain = `${userIdentifier}@inovie.fr`;
      console.log(`🔄 Solution de secours après erreur: ${emailWithDomain}`);
      return emailWithDomain;
    }
  };

  const forceRedirection = () => {
    console.log("Forçage de la redirection...");
    navigate('/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Éviter les soumissions multiples
    if (loading || isSubmitted) {
      console.log("Soumission déjà en cours, ignorée");
      return;
    }
    
    setError(null);
    setLoading(true);
    setIsSubmitted(true);
    
    console.log("Début de la tentative de connexion");

    try {
      // Trouver l'email correspondant à l'identifiant
      const email = await findEmailByIdentifier(identifier);
      
      if (!email) {
        setError('Identifiant non reconnu');
        setLoading(false);
        setIsSubmitted(false);
        return;
      }

      console.log(`Email identifié: ${email}, tentative de connexion...`);

      // Utiliser la fonction login du contexte d'authentification
      const user = await login(email, password);
      console.log("Login réussi, utilisateur:", user);
      
      // HACK: Forcer la redirection après un court délai si elle n'est pas automatique
      setTimeout(forceRedirection, 300);
      
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      setIsSubmitted(false);
      
      // Vérifier si c'est un problème de mot de passe temporaire
      try {
        const usersRef = collection(db, 'users');
        const email = await findEmailByIdentifier(identifier);
        if (email) {
          const q = query(usersRef, where('email', '==', email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            
            // Si l'utilisateur a un mot de passe temporaire et qu'il correspond
            if (userData.tempPassword && userData.tempPassword === password) {
              console.log('✅ Mot de passe temporaire valide, mais connexion Firebase impossible');
              setError('Votre mot de passe temporaire est correct, mais une erreur technique empêche la connexion. Veuillez contacter l\'administrateur.');
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Erreur lors de la vérification du mot de passe temporaire:", err);
      }
      
      // Sinon, afficher l'erreur standard
      const errorMessage = getErrorMessage(error.code);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode: string) => {
    if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found') {
      return 'Identifiant ou mot de passe incorrect. Vérifiez vos informations et réessayez.';
    } else if (errorCode === 'auth/too-many-requests') {
      return 'Trop de tentatives de connexion. Veuillez réessayer plus tard ou contactez votre administrateur.';
    } else if (errorCode === 'auth/user-disabled') {
      return 'Ce compte a été désactivé. Veuillez contacter votre administrateur.';
    } else if (errorCode === 'auth/invalid-email') {
      return 'Format d\'identifiant invalide. Veuillez réessayer avec votre identifiant Inovie.';
    } else {
      return `Une erreur s'est produite lors de la connexion. Veuillez réessayer.`;
    }
  };

  // Fonction pour gérer la réinitialisation du mot de passe
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Début de la réinitialisation du mot de passe');
      
      // Utiliser l'email saisi dans le pop-up ou l'identifiant du formulaire de connexion
      const emailToReset = resetEmail || await findEmailByIdentifier(identifier);
      
      console.log('📧 Email à réinitialiser:', emailToReset);
      
      if (!emailToReset) {
        console.error('❌ Aucun email fourni');
        setError('Veuillez saisir une adresse email valide.');
        setLoading(false);
        return;
      }
      
      // Envoyer l'email de réinitialisation
      await sendPasswordResetEmail(auth, emailToReset);
      console.log('✅ Email de réinitialisation envoyé avec succès');
      
      // Afficher un message de succès
      setResetEmailSent(true);
      setResetEmail('');
      alert(`Un email de réinitialisation a été envoyé à ${emailToReset}. Veuillez vérifier votre boîte de réception et suivre les instructions.`);
      
      // Après 5 secondes, fermer le pop-up
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetEmailSent(false);
      }, 5000);
      
    } catch (error: any) {
      console.error('❌ Erreur lors de la réinitialisation:', error);
      console.error('Détails:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      let errorMessage = 'Une erreur est survenue lors de la réinitialisation du mot de passe.';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Format d\'email invalide.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Aucun compte associé à cet email.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
          break;
        default:
          errorMessage = `Erreur: ${error.message}`;
      }
      
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour ouvrir Outlook Web avec les paramètres appropriés
  const openOutlookMail = (to: string, subject: string = '', body: string = '') => {
    // URL pour Outlook Web Access (OWA)
    const outlookWebUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Ouvrir dans un nouvel onglet
    window.open(outlookWebUrl, '_blank');
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <img 
          src={logoInovie}
          alt="Groupe Inovie" 
          className="header-logo"
        />
        <h2 className="login-title" style={{ textTransform: 'none', color: '#263471' }}>inovie SCAN</h2>
        
        {welcomeMessage && (
          <div className={`welcome-message ${isNewUserLogin ? 'welcome-message-new-user' : ''} ${isPasswordReset ? 'welcome-message-reset' : ''}`}>
            {welcomeMessage}
          </div>
        )}
        
        {infoMessage && (
          <div className="info-message">
            {infoMessage}
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="identifier">Identifiant</label>
            <input
              type="text"
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus={!identifier} // Ne pas prendre le focus si l'identifiant est déjà rempli
              placeholder="Votre identifiant"
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
              autoFocus={!!identifier} // Prendre le focus si l'identifiant est déjà rempli
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <footer className="login-footer">
          <p>Pour vous connecter, utilisez votre identifiant Inovie</p>
          <p>
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                // Création manuelle du message pour l'assistance
                const messageAssistance = "Bonjour," + 
                  "\n\n" + 
                  "Je vous contacte au sujet de l'application Inovie SCAN." + 
                  "\n\n" + 
                  "Mon identifiant : " + (identifier || "[À compléter]") + 
                  "\n\n" + 
                  "Description du problème : [Veuillez décrire votre problème ici]" + 
                  "\n\n" + 
                  "Merci pour votre aide." + 
                  "\n\n" + 
                  "Cordialement.";
                
                openOutlookMail(
                  'mickael.volle@inovie.fr',
                  'Demande d\'assistance - Application Inovie SCAN',
                  messageAssistance
                );
              }}
            >
              Contacter l'administrateur
            </a>
            {' | '}
            <a 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setShowForgotPassword(true);
              }}
            >
              Mot de passe oublié ?
            </a>
          </p>
        </footer>
      </div>
      <p className="version">version 1.0 | © 2025 inovie SCAN</p>
      
      {/* Pop-up de réinitialisation de mot de passe */}
      {showForgotPassword && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Réinitialisation de mot de passe</h3>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmailSent(false);
                  setResetEmail('');
                  setError(null);
                }}
              >
                &times;
              </button>
            </div>
            
            {resetEmailSent ? (
              <div className="reset-success">
                <p>Un email de réinitialisation a été envoyé à l'adresse indiquée.</p>
                <p>Veuillez vérifier votre boîte de réception et suivre les instructions pour réinitialiser votre mot de passe.</p>
                <p>Cette fenêtre se fermera automatiquement dans quelques secondes...</p>
              </div>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label htmlFor="reset-email">Adresse email</label>
                  <input
                    type="email"
                    id="reset-email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Votre adresse email"
                    required
                    autoFocus
                  />
                  <small className="form-text">
                    Saisissez l'adresse email associée à votre compte pour recevoir un lien de réinitialisation.
                  </small>
                </div>
                
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="button button-secondary"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                      setError(null);
                    }}
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="button button-primary"
                    disabled={loading}
                  >
                    {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;