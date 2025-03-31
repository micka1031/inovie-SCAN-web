import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc, getDoc, addDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth, PRODUCTION_URL } from '../config/firebase';
import './UserManagement.css';
import { createUserWithoutSignOut } from '../services/userService';
import { RoleService } from '../services/RoleService';
import { Role } from '../types/roles';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import { PAGES } from '../utils/pageAccessUtils';
import { roles } from '../services/RoleService';
import { User as ImportedUser } from '../types/User';
import { Role as ImportedRole } from '../types/roles';
import { RolePermissions } from '../utils/permissions';
import { UserRole } from '../types/roles';
import PoleSelector from './PoleSelector';
import { usePoles } from '../services/PoleService';
import PoleFilter from './PoleFilter';
// Importations MUI pour le dialogue de colonnes
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Typography,
  Divider
} from '@mui/material';

// Étendre l'interface User importée
type User = ImportedUser & {
  dateCreation?: string;
  dateModification?: string;
};

// Définition d'une interface pour les colonnes du tableau
interface ColumnDefinition {
  id: string;
  label: string;
  visible: boolean;
  width: string;
}

// Définition des colonnes par défaut
const DEFAULT_COLUMNS: ColumnDefinition[] = [
  { id: 'selection', label: 'Sélection', visible: true, width: '50px' },
  { id: 'nom', label: 'Nom', visible: true, width: '120px' },
  { id: 'email', label: 'Email', visible: true, width: '180px' },
  { id: 'uid', label: 'UID', visible: true, width: '120px' },
  { id: 'role', label: 'Rôle', visible: true, width: '120px' },
  { id: 'pole', label: 'Pôle', visible: true, width: '120px' },
  { id: 'statut', label: 'Statut', visible: true, width: '90px' },
  { id: 'actions', label: 'Actions', visible: true, width: '150px' }
];

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

  // Ajouter un état pour le filtre par pôle
  const [selectedPole, setSelectedPole] = useState<string>('');

  // État pour le menu déroulant de modification
  const [modifyMenuOpen, setModifyMenuOpen] = useState(false);

  // État pour le dialogue de colonnes
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);

  // État pour les définitions de colonnes avec chargement depuis localStorage
  const [columns, setColumns] = useState<ColumnDefinition[]>(() => {
    // Essayer de charger les colonnes depuis localStorage
    try {
      const savedColumns = localStorage.getItem('userManagementColumns');
      if (savedColumns) {
        return JSON.parse(savedColumns);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des colonnes:', error);
    }
    // Si aucune colonne n'est enregistrée ou en cas d'erreur, utiliser les valeurs par défaut
    return DEFAULT_COLUMNS;
  });

  const roleService = RoleService.getInstance();
  const { currentUser, hasPermission } = useAuth();
  const { poles } = usePoles();

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

  // Effet pour filtrer les utilisateurs en fonction de la recherche rapide et du pôle sélectionné
  useEffect(() => {
    let results = users;

    // Filtrer par pôle si un pôle est sélectionné
    if (selectedPole) {
      results = results.filter(user => user.pole === selectedPole);
    }

    // Ensuite, filtrer par recherche rapide
    if (quickSearch.trim()) {
      const searchTerm = quickSearch.toLowerCase().trim();
      results = results.filter(user => {
        return (
          (user.nom || '').toLowerCase().includes(searchTerm) ||
          (user.email || '').toLowerCase().includes(searchTerm) ||
          (user.identifiant || '').toLowerCase().includes(searchTerm) ||
          (user.role || '').toLowerCase().includes(searchTerm) ||
          (user.pole || '').toLowerCase().includes(searchTerm)
        );
      });
    }

    setFilteredUsers(results);
  }, [quickSearch, users, selectedPole]);

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
        saveAllChanges()
          .then(() => {
            // Désélectionner tout et quitter le mode édition
            setSelectedUsers([]);
            setNewUser(null);
            setEditMode(false);
          })
          .catch(error => {
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
      
      // Désactiver le mode édition après sauvegarde réussie
      setEditMode(false);
      setSelectedUsers([]);
      
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

  // Fonction pour convertir ID de pôle en nom
  const getPoleNameById = (poleId: string | undefined): string => {
    if (!poleId) return '-';
    const pole = poles.find(p => p.id === poleId);
    return pole ? pole.nom : poleId;
  };

  // Fonction pour gérer le changement de pôle
  const handlePoleChange = (pole: string) => {
    setSelectedPole(pole);
  };

  // Fonction pour basculer le menu de modification
  const handleToggleModifyMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    setModifyMenuOpen(!modifyMenuOpen);
  };

  // Fonction pour gérer les clics à l'extérieur du menu déroulant
  const handleClickOutside = () => {
    setModifyMenuOpen(false);
  };

  // Effet pour ajouter/supprimer l'écouteur d'événements pour les clics à l'extérieur
  useEffect(() => {
    if (modifyMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [modifyMenuOpen]);

  // Fonction pour ouvrir le dialogue de colonnes
  const handleOpenColumnDialog = () => {
    setColumnDialogOpen(true);
  };

  // Fonction pour fermer le dialogue de colonnes
  const handleCloseColumnDialog = () => {
    // Sauvegarder les colonnes dans localStorage lors de la fermeture du dialogue
    try {
      localStorage.setItem('userManagementColumns', JSON.stringify(columns));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des colonnes:', error);
    }
    setColumnDialogOpen(false);
  };

  // Fonction pour basculer la visibilité d'une colonne
  const handleToggleColumn = (id: string) => {
    setColumns(prev => {
      const newColumns = prev.map(col => 
        col.id === id ? { ...col, visible: !col.visible } : col
      );
      
      // Sauvegarder les changements dans localStorage
      try {
        localStorage.setItem('userManagementColumns', JSON.stringify(newColumns));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des colonnes:', error);
      }
      
      return newColumns;
    });
  };

  // Fonction pour réinitialiser les colonnes à leur état par défaut
  const handleResetColumns = () => {
    const resetColumns = DEFAULT_COLUMNS.map(col => ({ ...col }));
    setColumns(resetColumns);
    
    // Sauvegarder les changements dans localStorage
    try {
      localStorage.setItem('userManagementColumns', JSON.stringify(resetColumns));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des colonnes:', error);
    }
  };

  // Fonction pour sélectionner/désélectionner toutes les colonnes
  const handleSelectAllColumns = (selected: boolean) => {
    setColumns(prev => {
      const newColumns = prev.map(col => ({ ...col, visible: selected }));
      
      // Sauvegarder les changements dans localStorage
      try {
        localStorage.setItem('userManagementColumns', JSON.stringify(newColumns));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des colonnes:', error);
      }
      
      return newColumns;
    });
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
      <div className="user-management-container">
        <div className="section-header">
          <h2 className="section-title">Gestion des utilisateurs</h2>
        </div>
        
        {/* En-tête fixe avec les boutons d'action */}
        <div className="sticky-header-top">
          <div className="action-buttons-group">
            {!editMode ? (
              <>
                <button className="button button-primary" onClick={toggleEditMode}>
                  <i className="fas fa-edit"></i> Modifier
                </button>
              </>
            ) : (
              <>
                <button className="button button-success" onClick={saveAllChanges} disabled={loading}>
                  <i className="fas fa-save"></i> Enregistrer
                </button>
                <button className="button button-warning" onClick={handleCancelEdit} disabled={loading}>
                  <i className="fas fa-times"></i> Annuler
                </button>
                <button className="button button-info" onClick={addNewUserRow} disabled={loading}>
                  <i className="fas fa-plus"></i> Ajouter
                </button>
                <button className="button button-danger" onClick={handleDeleteSelected} disabled={selectedUsers.length === 0 || loading}>
                  <i className="fas fa-trash-alt"></i> Supprimer ({selectedUsers.length})
                </button>
                <button className="button button-info" onClick={handleOpenColumnDialog}>
                  <i className="fas fa-columns"></i> Colonnes
                </button>
              </>
            )}
          </div>
          <div className="quick-search-container">
            <input
              type="text"
              className="quick-search-input"
              placeholder="Recherche rapide..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              disabled={loading}
            />
            <select
              className="pole-filter"
              value={selectedPole}
              onChange={(e) => handlePoleChange(e.target.value)}
              disabled={loading}
            >
              <option value="">Filtrer par pôle</option>
              <option value="CENTRE">CENTRE</option>
              <option value="EST">EST</option>
              <option value="OUEST">OUEST</option>
              <option value="Administration">Administration</option>
            </select>
          </div>
        </div>

        <div className="users-table-container" style={{ marginTop: '20px' }}>
          <div className="results-info">
            <p>{filteredUsers.length} résultat(s) trouvé(s){quickSearch ? ` pour la recherche "${quickSearch}"` : ''}</p>
          </div>
          <table className={`sites-table ${editMode ? 'editing' : ''}`} style={{ fontSize: '0.8rem' }}>
            <thead>
              <tr>
                {editMode && columns.find(col => col.id === 'selection')?.visible && (
                  <th className="select-all-column">Sélection</th>
                )}
                {columns.filter(col => col.visible && col.id !== 'selection' && col.id !== 'actions').map(column => (
                  <th key={column.id} style={{ width: column.width }}>{column.label}</th>
                ))}
                {columns.find(col => col.id === 'actions')?.visible && (
                  <th className="actions-column">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {/* Afficher d'abord les nouveaux utilisateurs */}
              {editMode && newUser && (
                <tr key={newUser.id} className="new-user-row">
                  {columns.find(col => col.id === 'selection')?.visible && (
                    <td style={{display: 'none'}}>
                      {/* Cellule masquée pour maintenir l'alignement */}
                    </td>
                  )}
                  {columns.find(col => col.id === 'nom')?.visible && (
                    <td>
                      <input
                        type="text"
                        value={newUser.nom || ''}
                        onChange={(e) => handleNewUserChange('nom', e.target.value)}
                        className="inline-edit-input"
                        placeholder="Nom"
                      />
                    </td>
                  )}
                  {columns.find(col => col.id === 'email')?.visible && (
                    <td>
                      <input
                        type="email"
                        value={newUser.email || ''}
                        onChange={(e) => handleNewUserChange('email', e.target.value)}
                        className="inline-edit-input"
                        placeholder="Email"
                      />
                    </td>
                  )}
                  {columns.find(col => col.id === 'uid')?.visible && (
                    <td>
                      <input
                        type="text"
                        value={newUser.identifiant || ''}
                        onChange={(e) => handleNewUserChange('identifiant', e.target.value)}
                        className="inline-edit-input"
                        placeholder="Identifiant"
                      />
                    </td>
                  )}
                  {columns.find(col => col.id === 'role')?.visible && (
                    <td>
                      <select
                        value={newUser.role || ''}
                        onChange={(e) => handleNewUserChange('role', e.target.value)}
                        className="inline-edit-select"
                        title="Rôle de l'utilisateur"
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
                  )}
                  {columns.find(col => col.id === 'pole')?.visible && (
                    <td>
                      <PoleSelector
                        value={newUser.pole || ''}
                        onChange={(value) => handleNewUserChange('pole', value)}
                        placeholder="Sélectionner un pôle"
                        style={{ width: '100%' }}
                        showSearch
                        allowClear
                        title="Pôle de l'utilisateur"
                      />
                    </td>
                  )}
                  {columns.find(col => col.id === 'statut')?.visible && (
                    <td>
                      <select
                        value={newUser.statut || 'Actif'}
                        onChange={(e) => handleNewUserChange('statut', e.target.value)}
                        className="inline-edit-select"
                        title="Statut de l'utilisateur"
                      >
                        <option value="Actif">Actif</option>
                        <option value="Inactif">Inactif</option>
                      </select>
                    </td>
                  )}
                  {columns.find(col => col.id === 'actions')?.visible && (
                    <td>
                      {/* Le bouton de validation individuel a été supprimé car il est redondant avec le bouton Enregistrer du haut */}
                    </td>
                  )}
                </tr>
              )}
              
              {/* Ensuite afficher les utilisateurs existants */}
              {filteredUsers.map((user) => (
                <tr 
                  key={user.id} 
                  className={selectedUsers.includes(user.id!) ? 'selected-row' : ''}
                  onClick={() => editMode && handleUserSelect(user.id!)}
                >
                  {editMode && columns.find(col => col.id === 'selection')?.visible && (
                    <td className="checkbox-cell">
                      <input 
                        type="checkbox"
                        checked={selectedUsers.includes(user.id!)}
                        onChange={() => handleUserSelect(user.id!)}
                        title="Sélectionner cet utilisateur"
                        aria-label="Sélectionner cet utilisateur"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  {columns.find(col => col.id === 'nom')?.visible && (
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
                  )}
                  {columns.find(col => col.id === 'email')?.visible && (
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
                  )}
                  {columns.find(col => col.id === 'uid')?.visible && (
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
                  )}
                  {columns.find(col => col.id === 'role')?.visible && (
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
                  )}
                  {columns.find(col => col.id === 'pole')?.visible && (
                    <td>
                      {editMode ? (
                        <PoleSelector
                          value={editingUsers[user.id!]?.pole || user.pole || ''}
                          onChange={(value) => handleEditChange(user.id!, 'pole', value)}
                          placeholder="Sélectionner un pôle"
                          style={{ width: '100%' }}
                          showSearch
                          allowClear
                          title="Pôle de l'utilisateur"
                        />
                      ) : (
                        getPoleNameById(user.pole)
                      )}
                    </td>
                  )}
                  {columns.find(col => col.id === 'statut')?.visible && (
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
                  )}
                  {columns.find(col => col.id === 'actions')?.visible && (
                    <td>
                      {editMode && (
                        <button
                          className="reset-password-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetPassword(user.email);
                          }}
                          title="Réinitialiser le mot de passe de l'utilisateur"
                        >
                          <i className="fas fa-key"></i> Réinitialiser mot de passe
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogue de configuration des colonnes */}
      <Dialog open={columnDialogOpen} onClose={handleCloseColumnDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Configuration des colonnes</Typography>
        </DialogTitle>
        
        <Divider />
        
        <DialogContent>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleSelectAllColumns(true)}
              size="small"
            >
              Tout sélectionner
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleSelectAllColumns(false)}
              size="small"
            >
              Tout désélectionner
            </Button>
            <Button
              variant="outlined"
              onClick={handleResetColumns}
              size="small"
            >
              Réinitialiser
            </Button>
          </div>
          
          <List>
            {columns.map((column) => (
              <ListItem 
                key={column.id} 
                dense 
                button
                onClick={() => handleToggleColumn(column.id)}
                className={column.visible ? 'column-visible' : 'column-hidden'}
              >
                <Checkbox
                  checked={column.visible}
                  onChange={() => handleToggleColumn(column.id)}
                  color="primary"
                />
                <ListItemText primary={column.label} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        
        <Divider />
        
        <DialogActions>
          <Button onClick={handleCloseColumnDialog} variant="contained" color="primary">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </ProtectedRoute>
  );
};

export default UserManagement;

