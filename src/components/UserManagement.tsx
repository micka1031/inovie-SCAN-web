import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc, getDoc, addDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth, PRODUCTION_URL } from '../firebase';
import './UserManagement.css';
import { createUserWithoutSignOut } from '../services/userService';
import { RoleService } from '../services/RoleService';
import { Role } from '../types/roles';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import { PAGES } from '../utils/pageAccessUtils';
import { roles } from '../services/RoleService';

// Importer et étendre l'interface User existante
import { User as ImportedUser } from '../types/roles';

// Étendre l'interface User importée
type User = ImportedUser & {
  dateCreation?: string;
  dateModification?: string;
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingUsers, setEditingUsers] = useState<{[key: string]: User}>({});
  const [newUser, setNewUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [update, setUpdate] = useState(0);
  
  // État pour la recherche rapide
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  const roleService = RoleService.getInstance();
  const { currentUser, hasPermission } = useAuth();

  useEffect(() => {
    const initialize = async () => {
      try {
        const [fetchedRoles] = await Promise.all([
          roleService.getRoles(),
          fetchUsers()
        ]);
        setRoles(fetchedRoles);
      } catch (err) {
        setError('Erreur lors de l\'initialisation');
      }
    };

    initialize();
    checkAdminStatus();
  }, []);
  
  // Initialiser les utilisateurs filtrés au chargement
  useEffect(() => {
    setFilteredUsers(users);
  }, [users]);

  // Effet pour filtrer les utilisateurs en fonction de la recherche rapide
  useEffect(() => {
    if (!quickSearch.trim()) {
      // Si la recherche est vide, afficher tous les utilisateurs
      setFilteredUsers(users);
      return;
    }

    const searchTerm = quickSearch.toLowerCase().trim();
    const results = users.filter(user => {
      // Rechercher dans tous les champs textuels de l'utilisateur
      return (
        (user.nom || '').toLowerCase().includes(searchTerm) ||
        (user.email || '').toLowerCase().includes(searchTerm) ||
        (user.identifiant || '').toLowerCase().includes(searchTerm) ||
        (user.role || '').toLowerCase().includes(searchTerm) ||
        (user.pole || '').toLowerCase().includes(searchTerm) ||
        (user.statut || '').toLowerCase().includes(searchTerm)
      );
    });

    setFilteredUsers(results);
  }, [quickSearch, users]);

  useEffect(() => {
    console.log('🔐 Permissions de l\'utilisateur courant:', {
      user: currentUser,
      hasUsersViewPermission: hasPermission('users.view'),
      hasUsersCreatePermission: hasPermission('users.create'),
      hasUsersEditPermission: hasPermission('users.edit'),
      hasUsersDeletePermission: hasPermission('users.delete'),
      userRole: currentUser?.role,
      userPermissions: currentUser?.permissions
    });

    // Vérifier si l'utilisateur a accès à la page de gestion des utilisateurs
    const canAccessUserManagement = 
      hasPermission('users.view') || 
      currentUser?.role === 'Administrateur';

    console.log('🚪 Accès à la gestion des utilisateurs:', canAccessUserManagement);
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        // S'assurer que l'UID est défini pour tous les utilisateurs
        if (!data.uid && data.identifiant) {
          // Si l'UID n'est pas défini mais que l'identifiant existe, utiliser l'identifiant comme UID
          data.uid = data.identifiant;
        }
        return {
          id: doc.id,
          ...data
        } as User;
      });
      
      setUsers(usersList);
      setLoading(false);
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
      setLoading(false);
    }
  };

  const checkAdminStatus = () => {
    const currentUser = auth.currentUser;
    setIsAdmin(currentUser?.email === 'mickael.volle@inovie.fr');
  };

  const handleResetPassword = async (email: string) => {
    console.log('🔐 Début de handleResetPassword');
    console.log('Email reçu:', email);

    setError(null);

    try {
        if (!email || email.trim() === '') {
            console.error('❌ Email invalide');
            setError('L\'email est invalide');
            return;
        }

        console.log('🔍 Tentative d\'envoi de l\'email de réinitialisation');
        
        const currentUser = auth.currentUser;
        if (!currentUser || !currentUser.email) {
            console.error('❌ Aucun utilisateur connecté ou email non disponible');
            setError('Vous devez être connecté pour effectuer cette action');
            return;
        }
        
        const adminEmail = currentUser.email;
        console.log('📧 Email de l\'administrateur connecté:', adminEmail);
        console.log('📧 Email de l\'utilisateur à réinitialiser:', email);
        
        // Configuration personnalisée pour l'email de réinitialisation Firebase
        const resetActionCodeSettings = {
            url: PRODUCTION_URL + `/login?email=${encodeURIComponent(email)}&reset=true`,
            handleCodeInApp: true
        };
        
        console.log('📝 URL de redirection configurée:', resetActionCodeSettings.url);
        
        // Envoyer l'email de réinitialisation Firebase
        await sendPasswordResetEmail(auth, email, resetActionCodeSettings);
        console.log('📧 Email de réinitialisation Firebase envoyé avec succès');
        
        console.log('✅ Processus de réinitialisation de mot de passe terminé avec succès');
        alert(`
            ✅ Réinitialisation de mot de passe effectuée !
            
            Un email de réinitialisation a été envoyé à ${email}.
            
            L'utilisateur pourra :
            1. Cliquer sur le lien dans l'email pour définir son mot de passe
            2. Utiliser la fonction "Mot de passe oublié" sur la page de connexion
            
            ATTENTION : Le lien dans l'email est valable pendant 1 heure seulement.
        `.trim());
    } catch (error: any) {
        console.error('❌ ERREUR COMPLETE lors de la réinitialisation du mot de passe:', error);
        
        console.error('Détails de l\'erreur:', {
            name: error.name,
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        let errorMessage = 'Une erreur est survenue';
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Format d\'email invalide';
                break;
            case 'auth/user-not-found':
                errorMessage = 'Aucun utilisateur trouvé avec cet email';
                break;
            case 'auth/missing-email':
                errorMessage = 'Aucun email n\'a été fourni';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
                break;
            default:
                errorMessage = `Impossible d'envoyer l'email de réinitialisation : ${error.message}`;
        }
        
        console.error('❌ Message d\'erreur:', errorMessage);
        setError(errorMessage);
        
        alert(errorMessage);
    }
};

  const toggleEditMode = () => {
    if (!editMode) {
      // Si on entre en mode édition, initialiser l'état d'édition avec les utilisateurs actuels
      console.log("Entrée en mode édition");
      const initialEditState: {[key: string]: User} = {};
      users.forEach(user => {
        initialEditState[user.id!] = {...user};
      });
      setEditingUsers(initialEditState);
      setNewUser(null);
      // Activer le mode édition
      setEditMode(true);
    } else {
      // Si on quitte le mode édition, demander confirmation
      if (window.confirm("Voulez-vous enregistrer les modifications ?")) {
        console.log("Sauvegarde des modifications avant de quitter le mode édition");
        // Sauvegarder les modifications et quitter le mode édition après la sauvegarde
        saveAllChanges().then(() => {
          // Désélectionner tout et quitter le mode édition
          setSelectedUsers([]);
          setNewUser(null);
          setEditMode(false);
        }).catch(error => {
          console.error("Erreur lors de la sauvegarde:", error);
          // Laisser l'utilisateur en mode édition en cas d'erreur
          alert("Une erreur est survenue lors de la sauvegarde. Veuillez réessayer.");
        });
      } else {
        console.log("Annulation des modifications et sortie du mode édition");
        // Annuler les modifications et quitter le mode édition
        setEditingUsers({});
        setNewUser(null);
        setSelectedUsers([]);
        setEditMode(false);
      }
    }
  };

  // Fonction utilitaire pour créer un utilisateur par défaut
  const createDefaultUser = (): User => ({
    identifiant: '',
    email: '',
    nom: '',
    role: 'Utilisateur',
    pole: '',
    statut: 'Actif',
    permissions: []
  });

  // Fonction pour convertir un objet partiel en User complet
  const toFullUser = (partialUser: Partial<User> | null | undefined): User => {
    if (!partialUser) {
      return createDefaultUser();
    }

    return {
      ...createDefaultUser(),
      ...partialUser,
      nom: partialUser.nom || '',
      email: partialUser.email || '',
      role: partialUser.role || 'Utilisateur',
      pole: partialUser.pole || '',
      statut: partialUser.statut || 'Actif',
      identifiant: partialUser.identifiant || '',
      permissions: partialUser.permissions || []
    };
  };

  // Modifier handleNewUserChange pour utiliser toFullUser
  const handleNewUserChange = (field: keyof User, value: string) => {
    setNewUser(prev => {
      const currentUser = toFullUser(prev);
      return {
        ...currentUser,
        [field]: value
      };
    });
  };

  // Modifier handleAddUser pour gérer les types
  const handleAddUser = async () => {
    // Vérifier que newUser n'est pas null
    if (!newUser) {
      console.error('Aucun nouvel utilisateur à ajouter');
      return;
    }

    // Convertir le nouvel utilisateur en objet User complet
    const userDraft = toFullUser(newUser);

    try {
      // Vérifier que les champs requis sont remplis
      if (!userDraft.nom || !userDraft.email || !userDraft.role) {
        console.error('Tous les champs requis doivent être remplis');
        return;
      }

      // Trouver le rôle sélectionné et ses permissions
      const selectedRole = roles.find(r => r.name === userDraft.role);
      if (!selectedRole) {
        console.error('Rôle non trouvé');
        return;
      }

      // Créer l'utilisateur avec les permissions du rôle
      const userToAdd: User = {
        ...userDraft,
        permissions: selectedRole.permissions,
        dateCreation: new Date().toISOString(),
        dateModification: new Date().toISOString()
      };

      // Ajouter l'utilisateur à Firestore
      const userRef = await addDoc(collection(db, 'users'), userToAdd);

      // Réinitialiser le formulaire
      setNewUser(null);
      setUsers(prevUsers => [...prevUsers, { ...userToAdd, id: userRef.id }]);

    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'utilisateur:', error);
    }
  };

  const handleEditChange = async (userId: string, field: keyof User, value: string) => {
    if (!userId) return;
    
    setEditingUsers(prev => {
      const currentUser = prev[userId] || { ...users.find(u => u.id === userId) || {} };
      
      // Si le champ modifié est le rôle, récupérer les permissions associées
      if (field === 'role') {
        const selectedRole = roles.find(r => r.name === value);
        return {
          ...prev,
          [userId]: {
            ...currentUser,
            [field]: value,
            permissions: selectedRole?.permissions || []
          }
        };
      }
      
      return {
        ...prev,
        [userId]: {
          ...currentUser,
          [field]: value
        }
      };
    });
  };

  const getStatusClass = (statut: string | undefined) => {
    if (!statut) return '';
    
    switch (statut.toLowerCase()) {
      case 'actif':
        return 'livré';
      case 'inactif':
        return 'en-cours';
      default:
        return '';
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleDeleteSelected = async () => {
    try {
      // Vérifier s'il y a des utilisateurs sélectionnés
      if (selectedUsers.length === 0) {
        alert('❌ Aucun utilisateur sélectionné');
        return;
      }
      
      // Demander confirmation avant de supprimer
      if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedUsers.length} utilisateur(s) ?
      
⚠️ ATTENTION: Les utilisateurs seront supprimés uniquement de la base de données Firestore, mais PAS de Firebase Authentication.
Pour une suppression complète, contactez l'administrateur système.`)) {
        return;
      }
      
      // Récupérer les utilisateurs sélectionnés
      const selectedUsersList = users.filter(user => selectedUsers.includes(user.id!));
      
      console.log(`🔄 Tentative de suppression de ${selectedUsers.length} utilisateurs de Firestore`);
      
      // Supprimer les utilisateurs de Firestore uniquement
      const deletePromises = selectedUsers.map(userId => 
        deleteDoc(doc(db, 'users', userId))
      );
      
      // Attendre que toutes les suppressions soient terminées
      await Promise.all(deletePromises);
      
      // Mettre à jour l'état local
      const updatedUsers = users.filter(user => !selectedUsers.includes(user.id!));
      setUsers(updatedUsers);
      setSelectedUsers([]);
      
      // Afficher un message de succès avec un avertissement
      alert(`
        ✅ ${selectedUsers.length} utilisateur(s) supprimé(s) de la base de données Firestore avec succès.
        
        ⚠️ IMPORTANT: Les comptes utilisateurs n'ont PAS été supprimés de Firebase Authentication.
        Si nécessaire, ces comptes devront être supprimés manuellement par un administrateur
        depuis la console Firebase.
      `.trim());
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des utilisateurs:', error);
      setError('Erreur lors de la suppression des utilisateurs');
      alert('❌ Erreur lors de la suppression des utilisateurs');
    }
  };

  const saveAllChanges = async (): Promise<void> => {
    try {
      setLoading(true);
      const batch: Promise<any>[] = [];

      // Sauvegarder les modifications d'utilisateurs existants
      for (const userId in editingUsers) {
        if (Object.prototype.hasOwnProperty.call(editingUsers, userId)) {
          const user = editingUsers[userId];
          
          // Empêcher la promotion d'un utilisateur au rôle d'Administrateur
          const adminRole = roles.find(r => r.name === 'Administrateur');
          if (user.role === 'Administrateur' && adminRole && user.id) {
            // Vérifier si l'utilisateur n'est pas déjà dans les permissions d'admin
            if (!adminRole.permissions.includes(user.id)) {
              // Si l'utilisateur n'était pas déjà Administrateur, réinitialiser au rôle précédent
              const originalUser = users.find(u => u.id === userId);
              if (originalUser && originalUser.role !== 'Administrateur') {
                user.role = originalUser.role;
                console.warn(`Tentative non autorisée de promotion au rôle d'Administrateur pour l'utilisateur ${user.nom || user.email}`);
                alert(`Le rôle "Administrateur" ne peut pas être attribué via cette interface. L'utilisateur ${user.nom || user.email} conservera son rôle ${user.role}.`);
              }
            }
          }
          
          if (!user.dateModification) {
            user.dateModification = new Date().toISOString();
          }
          
          const userRef = doc(db, 'users', userId);
          
          // Créer un objet avec uniquement les champs modifiables
          const { id, uid, ...updateData } = user;
          batch.push(updateDoc(userRef, updateData));
        }
      }
      
      // Ajouter le nouvel utilisateur si présent
      let newUserPromise: Promise<any> | null = null;
      if (newUser) {
        console.log("Préparation de l'ajout d'un nouvel utilisateur:", newUser);
        
        // Vérifier que tous les champs obligatoires sont remplis
        if (!newUser.email || !newUser.nom) {
          console.warn("Champs obligatoires manquants pour le nouvel utilisateur");
          // Ne pas bloquer la sauvegarde si le nouvel utilisateur est incomplet
          setNewUser(null);
        } else {
          // Empêcher l'attribution du rôle Administrateur à un nouvel utilisateur
          if (newUser.role === 'Administrateur') {
            console.warn("Tentative non autorisée d'attribution du rôle Administrateur à un nouvel utilisateur");
            newUser.role = 'Utilisateur'; // Assigner un rôle par défaut
            alert('Le rôle "Administrateur" ne peut pas être attribué via cette interface. Le nouvel utilisateur sera créé avec le rôle "Utilisateur".');
          }
          
          newUserPromise = (async () => {
            try {
              // Préparer les données de l'utilisateur avec des valeurs par défaut sûres
              const userToSave: User = {
                identifiant: newUser.identifiant || '',
                email: newUser.email || '',
                nom: newUser.nom || '',
                role: newUser.role || 'Utilisateur',
                pole: newUser.pole || '',
                statut: newUser.statut || 'Actif',
                permissions: newUser.permissions || []
              };
              
              // Appeler notre service pour créer l'utilisateur
              const result = await createUserWithoutSignOut(userToSave);
              
              if (result.success) {
                console.log(`Nouvel utilisateur ajouté avec l'ID: ${result.docId}`);
                return result.docId;
              } else {
                throw result.error || new Error('La création de l\'utilisateur a échoué');
              }
            } catch (error) {
              console.error(`Erreur lors de l'ajout du nouvel utilisateur:`, error);
              throw error;
            }
          })();
        }
      }
      
      // Attendre que toutes les opérations soient terminées
      const updateResults = await Promise.allSettled(batch);
      const newUserResults = newUserPromise ? await Promise.allSettled([newUserPromise]) : [];
      const results = [...updateResults, ...newUserResults];
      
      // Vérifier les résultats
      const fulfilled = results.filter(result => result.status === 'fulfilled').length;
      const rejected = results.filter(result => result.status === 'rejected').length;
      
      console.log(`Opérations terminées: ${fulfilled} réussies, ${rejected} échouées`);
      
      if (rejected > 0) {
        console.warn("Certaines opérations ont échoué. Voir les erreurs ci-dessus.");
      }
      
      // Rafraîchir les données
      await fetchUsers();
      
      // Réinitialiser les états
      setEditingUsers({});
      setNewUser(null);
      
      if (rejected > 0) {
        alert(`Modifications partiellement enregistrées. ${rejected} opérations ont échoué.`);
      } else {
        alert(`Modifications enregistrées avec succès. ${Object.keys(editingUsers).length} utilisateur(s) mis à jour.`);
      }
    } catch (error: unknown) {
      console.error('Erreur lors de la sauvegarde:', error);
      setError('Erreur lors de la sauvegarde');
      alert('Erreur lors de la sauvegarde des modifications. Veuillez réessayer.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const testFirebaseConnection = async () => {
    try {
        // Test minimal de connexion
        const testDocRef = doc(db, '_test', 'connection');
        const timestamp = await getDoc(testDocRef);
        console.log('✅ Connexion Firebase réussie');
    } catch (error) {
        console.error('❌ Erreur de connexion Firebase:', error);
    }
  };

  console.log('🌍 Environnement actuel:', {
    nodeEnv: process.env.NODE_ENV,
    isDevelopment: process.env.NODE_ENV === 'development'
  });

  const addNewUserRow = () => {
    // Forcer l'activation du mode édition
    if (!editMode) {
      setEditMode(true);
    }

    // Initialiser un nouvel utilisateur temporaire
    setNewUser({
      id: `temp-${Date.now()}`,
      nom: '',
      email: '',
      role: roles.length > 0 ? roles[0].name : 'Utilisateur',
      pole: '',
      statut: 'Actif',
      identifiant: '',
      permissions: []
    });

    // Forcer la mise à jour du composant
    setUpdate(prev => prev + 1);

    // Ajouter un délai pour permettre le rendu
    setTimeout(() => {
      const firstInput = document.querySelector('.user-management-table .new-user-row input') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  };

  // Modification de la méthode de confirmation d'annulation
  const handleCancelEdit = () => {
    if (window.confirm("Êtes-vous sûr de vouloir annuler toutes les modifications ?")) {
      setEditingUsers({});
      setNewUser(null);
      setSelectedUsers([]);
      setEditMode(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des utilisateurs...</p>
      </div>
    );
  }

  return (
    <ProtectedRoute 
      userRole={currentUser?.role || ''} 
      allowedRoles={['admin', 'manager']} 
      requiredPermissions={['users.view']}
      pageName={PAGES.USER_MANAGEMENT}
      roles={roles}
    >
      <div>
        <div className="section-header">
          <h2 className="section-title">Gestion des utilisateurs</h2>
        </div>

        <div className="sticky-header-container">
          <div className="header-actions">
            {editMode ? (
              <>
                <button 
                  className="button button-save" 
                  onClick={saveAllChanges}
                  disabled={loading || (selectedUsers.length === 0 && !newUser)}
                  style={{ 
                    backgroundColor: '#4CAF50', // Vert
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                  title="Enregistrer les modifications"
                >
                  <i className="fas fa-save"></i> Enr. {selectedUsers.length > 0 || newUser ? 
                    `(${selectedUsers.length}${newUser ? `+1` : ''})` : 
                    ''}
                </button>
                <button 
                  className="button button-secondary" 
                  onClick={handleCancelEdit}
                  style={{ marginLeft: '5px' }}
                  disabled={loading}
                  title="Annuler les modifications"
                >
                  <i className="fas fa-times"></i> Annuler
                </button>
                <button 
                  className="button" 
                  onClick={addNewUserRow}
                  style={{ 
                    marginLeft: '5px',
                    backgroundColor: '#FF9800', // Orange
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                  disabled={loading}
                  title="Ajouter un nouvel utilisateur"
                >
                  <i className="fas fa-plus"></i> Ajouter
                </button>
                <button 
                  className="button button-danger" 
                  onClick={handleDeleteSelected}
                  disabled={selectedUsers.length === 0 || loading}
                  style={{ 
                    marginLeft: '5px',
                    backgroundColor: '#f44336', 
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                  title="Supprimer les utilisateurs sélectionnés"
                >
                  <i className="fas fa-trash-alt"></i> Sup. ({selectedUsers.length})
                </button>
              </>
            ) : (
              <button 
                className="button" 
                onClick={toggleEditMode}
              >
                <i className="fas fa-edit"></i> Modifier
              </button>
            )}
          </div>
          
          <div className="quick-search-container" style={{ marginTop: '10px' }}>
            <input
              type="text"
              className="quick-search-input"
              placeholder="Recherche rapide..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="users-table-container">
          <div className="results-info">
            <p>{filteredUsers.length} résultat(s) trouvé(s){quickSearch ? ` pour la recherche "${quickSearch}"` : ''}</p>
          </div>
          <table className={`data-table user-management-table ${editMode ? 'editing' : ''}`} style={{ fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th style={{width: '50px'}}>{editMode ? 'Sélection' : ''}</th>
                <th>Nom</th>
                <th>Email</th>
                <th>UID</th>
                <th>Rôle</th>
                <th>Pôle</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Afficher d'abord les nouveaux utilisateurs */}
              {editMode && newUser && (
                <tr key={newUser.id} className="new-user-row">
                  <td style={{display: 'none'}}>
                    {/* Cellule masquée pour maintenir l'alignement */}
                  </td>
                  <td>
                    <input
                      type="text"
                      value={newUser.nom || ''}
                      onChange={(e) => handleNewUserChange('nom', e.target.value)}
                      className="inline-edit-input"
                      placeholder="Nom"
                    />
                  </td>
                  <td>
                    <input
                      type="email"
                      value={newUser.email || ''}
                      onChange={(e) => handleNewUserChange('email', e.target.value)}
                      className="inline-edit-input"
                      placeholder="Email"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={newUser.identifiant || ''}
                      onChange={(e) => handleNewUserChange('identifiant', e.target.value)}
                      className="inline-edit-input"
                      placeholder="Identifiant"
                    />
                  </td>
                  <td>
                    <select
                      value={newUser.role || ''}
                      onChange={(e) => handleNewUserChange('role', e.target.value)}
                      className="inline-edit-select"
                    >
                      <option value="">Sélectionner un rôle</option>
                      {roles
                        .filter(role => role.name !== 'Administrateur')
                        .map(role => (
                          <option key={role.id} value={role.name}>{role.name}</option>
                        ))
                      }
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={newUser.pole || ''}
                      onChange={(e) => handleNewUserChange('pole', e.target.value)}
                      className="inline-edit-input"
                      placeholder="Pôle"
                    />
                  </td>
                  <td>
                    <select
                      value={newUser.statut || 'Actif'}
                      onChange={(e) => handleNewUserChange('statut', e.target.value)}
                      className="inline-edit-select"
                    >
                      <option value="Actif">Actif</option>
                      <option value="Inactif">Inactif</option>
                    </select>
                  </td>
                  <td>
                    {/* Le bouton de validation individuel a été supprimé car il est redondant avec le bouton Enregistrer du haut */}
                  </td>
                </tr>
              )}
              
              {/* Ensuite afficher les utilisateurs existants */}
              {filteredUsers.map((user) => (
                <tr 
                  key={user.id} 
                  className={selectedUsers.includes(user.id!) ? 'selected-row' : ''}
                >
                  {editMode && (
                    <td>
                      <input 
                        type="checkbox"
                        checked={selectedUsers.includes(user.id!)}
                        onChange={() => handleUserSelect(user.id!)}
                        title="Sélectionner cet utilisateur"
                        aria-label="Sélectionner cet utilisateur"
                      />
                    </td>
                  )}
                  <td>
                    {editMode ? (
                      <input
                        type="text" 
                        value={editingUsers[user.id!]?.nom || user.nom}
                        onChange={(e) => handleEditChange(user.id!, 'nom', e.target.value)}
                        className="inline-edit-input"
                        title="Nom de l'utilisateur"
                        aria-label="Modifier le nom de l'utilisateur"
                        placeholder="Nom"
                      />
                    ) : (
                      user.nom
                    )}
                  </td>
                  <td>
                    {editMode ? (
                      <input
                        type="email"
                        value={editingUsers[user.id!]?.email || user.email}
                        onChange={(e) => handleEditChange(user.id!, 'email', e.target.value)}
                        className="inline-edit-input"
                        title="Email de l'utilisateur"
                        aria-label="Modifier l'email de l'utilisateur"
                        placeholder="Email"
                      />
                    ) : (
                      user.email
                    )}
                  </td>
                  <td>
                    {editMode ? (
                      <span className="uid-display">
                        {user.email === 'mickael.volle@inovie.fr' ? 'admin-mickael-volle' : 
                         user.identifiant === 'admin' ? 'admin-system' : 
                         user.uid || user.identifiant || 'Non disponible'}
                      </span>
                    ) : (
                      <span className="uid-display">
                        {user.email === 'mickael.volle@inovie.fr' ? 'admin-mickael-volle' : 
                         user.identifiant === 'admin' ? 'admin-system' : 
                         user.uid || user.identifiant || 'Non disponible'}
                      </span>
                    )}
                  </td>
                  <td>
                    {editMode ? (
                      <select
                        value={editingUsers[user.id!]?.role || user.role}
                        onChange={(e) => handleEditChange(user.id!, 'role', e.target.value)}
                        className="inline-edit-select"
                        title="Rôle de l'utilisateur"
                        aria-label="Modifier le rôle de l'utilisateur"
                        disabled={user.email === 'mickael.volle@inovie.fr'}
                      >
                        {roles
                          .filter(role => {
                            // Montrer le rôle Administrateur seulement si l'utilisateur l'a déjà
                            if (role.name === 'Administrateur') {
                              return user.role === 'Administrateur';
                            }
                            return true;
                          })
                          .map(role => (
                            <option key={role.id} value={role.name}>
                              {role.name}
                            </option>
                          ))
                        }
                      </select>
                    ) : (
                      <div className="role-display">
                        <span className="role-name">{user.role}</span>
                        <span className="role-description">
                          {roles.find(r => r.name === user.role)?.description}
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    {editMode ? (
                      <input 
                        type="text" 
                        value={editingUsers[user.id!]?.pole || user.pole}
                        onChange={(e) => handleEditChange(user.id!, 'pole', e.target.value)}
                        className="inline-edit-input"
                        title="Pôle de l'utilisateur"
                        aria-label="Modifier le pôle de l'utilisateur"
                        placeholder="Pôle"
                      />
                    ) : (
                      user.pole
                    )}
                  </td>
                  <td>
                    {editingUsers[user.id!] && editMode ? (
                      <select
                        value={editingUsers[user.id!].statut || ''}
                        onChange={(e) => handleEditChange(user.id!, 'statut', e.target.value)}
                        className="inline-edit-select"
                        title="Statut de l'utilisateur"
                        aria-label="Modifier le statut de l'utilisateur"
                      >
                        <option value="Actif">Actif</option>
                        <option value="Inactif">Inactif</option>
                      </select>
                    ) : (
                      <span className={getStatusClass(user.statut)}>
                        {user.statut || 'Non défini'}
                      </span>
                    )}
                  </td>
                  <td>
                    {editMode && (
                      <button
                        className="reset-password-button"
                        onClick={() => handleResetPassword(user.email)}
                        title="Réinitialiser le mot de passe de l'utilisateur"
                      >
                        <i className="fas fa-key"></i> Réinitialiser mot de passe
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default UserManagement;