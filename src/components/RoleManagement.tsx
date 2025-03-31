import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import './RoleManagement.css';
import { RoleService } from '../services/RoleService';
import { Role as RoleType } from '../types/roles';
import { PAGES, PageName } from '../utils/pageAccessUtils';
import PageAccessManagement from './PageAccessManagement';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isDefault?: boolean;
  isAdmin?: boolean;
  pageAccess?: { [key: string]: boolean };
}

const DEFAULT_PERMISSIONS: Permission[] = [
  // Gestion des utilisateurs
  { id: 'users.view', name: 'Lecture des utilisateurs', description: 'Voir la liste des utilisateurs (page utilisateurs)', category: 'Utilisateurs' },
  { id: 'users.create', name: 'Création d\'utilisateurs', description: 'Créer de nouveaux utilisateurs', category: 'Utilisateurs' },
  { id: 'users.edit', name: 'Modification des utilisateurs', description: 'Modifier les informations des utilisateurs', category: 'Utilisateurs' },
  { id: 'users.delete', name: 'Suppression des utilisateurs', description: 'Supprimer des utilisateurs', category: 'Utilisateurs' },
  
  // Gestion des sites
  { id: 'sites.view', name: 'Lecture des sites', description: 'Voir la liste des sites (page sites)', category: 'Sites' },
  { id: 'sites.create', name: 'Création de sites', description: 'Créer de nouveaux sites', category: 'Sites' },
  { id: 'sites.edit', name: 'Modification des sites', description: 'Modifier les informations des sites', category: 'Sites' },
  { id: 'sites.delete', name: 'Suppression des sites', description: 'Supprimer des sites', category: 'Sites' },
  
  // Gestion des tournées
  { id: 'tournees.view', name: 'Lecture des tournées', description: 'Voir la liste des tournées (page tournées)', category: 'Tournées' },
  { id: 'tournees.create', name: 'Création de tournées', description: 'Créer de nouvelles tournées', category: 'Tournées' },
  { id: 'tournees.edit', name: 'Modification des tournées', description: 'Modifier les tournées', category: 'Tournées' },
  { id: 'tournees.delete', name: 'Suppression des tournées', description: 'Supprimer des tournées', category: 'Tournées' },
  
  // Gestion des passages
  { id: 'passages.view', name: 'Lecture des passages', description: 'Voir les passages (page passages)', category: 'Passages' },
  { id: 'passages.create', name: 'Création de passages', description: 'Créer des passages', category: 'Passages' },
  { id: 'passages.edit', name: 'Modification des passages', description: 'Modifier les passages', category: 'Passages' },
  { id: 'passages.delete', name: 'Suppression des passages', description: 'Supprimer des passages', category: 'Passages' },
  
  // Gestion des véhicules
  { id: 'vehicules.view', name: 'Lecture des véhicules', description: 'Voir la liste des véhicules (page véhicules)', category: 'Véhicules' },
  { id: 'vehicules.create', name: 'Création de véhicules', description: 'Créer de nouveaux véhicules', category: 'Véhicules' },
  { id: 'vehicules.edit', name: 'Modification des véhicules', description: 'Modifier les véhicules', category: 'Véhicules' },
  { id: 'vehicules.delete', name: 'Suppression des véhicules', description: 'Supprimer des véhicules', category: 'Véhicules' },
  
  // Gestion de la carte
  { id: 'carte.view', name: 'Accès à la carte', description: 'Voir et utiliser la carte interactive (page carte)', category: 'Carte' },
  { id: 'carte.edit', name: 'Modification de la carte', description: 'Modifier les paramètres de la carte', category: 'Carte' },
  
  // Accès aux fonctionnalités
  { id: 'dashboard.view', name: 'Accès au tableau de bord', description: 'Voir et utiliser le tableau de bord (page principale)', category: 'Fonctionnalités' },
  { id: 'init-passages.view', name: 'Initialisation des passages', description: 'Accéder à la page d\'initialisation des passages', category: 'Fonctionnalités' },
  { id: 'configuration_systeme', name: 'Configuration système', description: 'Accéder aux paramètres système (page admin)', category: 'Administration' }
];

const DEFAULT_ROLES: Role[] = [
  {
    id: 'administrateur',
    name: 'Administrateur',
    description: 'Accès complet à toutes les fonctionnalités',
    permissions: DEFAULT_PERMISSIONS.map(p => p.id),
    isDefault: true,
    isAdmin: true
  },
  {
    id: 'utilisateur',
    name: 'Utilisateur',
    description: 'Accès standard aux fonctionnalités de base',
    permissions: [
      'passages.view',
      'passages.create',
      'passages.edit',
      'sites.view',
      'sites.create',
      'sites.edit',
      'tournees.view',
      'tournees.create',
      'tournees.edit',
      'vehicules.view',
      'vehicules.create',
      'vehicules.edit',
      'dashboard.view',
      'init-passages.view',
      'carte.view'
    ],
    isDefault: true
  },
  {
    id: 'coursier',
    name: 'Coursier',
    description: 'Accès limité aux passages',
    permissions: [
      'passages.view',
      'passages.create',
      'passages.edit'
    ],
    isDefault: true
  }
];

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<RoleType[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRole, setNewRole] = useState<Role>({
    id: '',
    name: '',
    description: '',
    permissions: []
  });
  const [activeTab, setActiveTab] = useState('permissions'); // 'permissions' ou 'pageAccess'

  const roleService = RoleService.getInstance();

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Chargement des rôles...");
      
      // Récupérer les rôles existants
      const existingRoles = await roleService.getRoles();
      console.log("Rôles existants:", existingRoles);
      
      if (existingRoles.length === 0) {
        console.log("Aucun rôle trouvé, initialisation des rôles par défaut...");
        await initializeDefaultRoles();
        // Recharger les rôles après l'initialisation
        const updatedRoles = await roleService.getRoles();
        setRoles(updatedRoles);
      } else {
        console.log("Rôles chargés avec succès:", existingRoles);
        setRoles(existingRoles);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des rôles:', err);
      setError('Erreur lors du chargement des rôles');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultRoles = async () => {
    try {
      console.log("Démarrage de l'initialisation des rôles par défaut...");
      
      for (const role of DEFAULT_ROLES) {
        try {
          // Vérifier d'abord si le rôle existe déjà
          const roleRef = doc(db, 'roles', role.id);
          const roleDoc = await getDoc(roleRef);
          
          if (!roleDoc.exists()) {
            console.log(`Création du rôle ${role.name}...`);
            await setDoc(roleRef, role);
            console.log(`Rôle ${role.name} créé avec succès.`);
          } else {
            console.log(`Le rôle ${role.name} existe déjà.`);
          }
        } catch (roleError) {
          console.error(`Erreur lors de la création du rôle ${role.name}:`, roleError);
        }
      }
    } catch (err) {
      console.error('Erreur lors de l\'initialisation des rôles par défaut:', err);
      throw err;
    }
  };

  const handleRoleSelect = (role: RoleType) => {
    setSelectedRole(role);
  };

  const handlePermissionToggle = async (roleId: string, permissionId: string) => {
    console.log('handlePermissionToggle appelé avec:', { roleId, permissionId });
    
    const role = roles.find(r => r.id === roleId);
    if (!role) {
      console.error('Rôle non trouvé:', roleId);
      return;
    }

    try {
      setError(null);
      
      // Créer une copie des permissions actuelles
      const currentPermissions = [...role.permissions];
      const newPermissions = currentPermissions.includes(permissionId)
        ? currentPermissions.filter(p => p !== permissionId)
        : [...currentPermissions, permissionId];

      // Mettre à jour l'état local immédiatement pour une réponse instantanée
      const updatedRole = { ...role, permissions: newPermissions };
      setRoles(prevRoles => 
        prevRoles.map(r => r.id === roleId ? updatedRole : r)
      );
      setSelectedRole(updatedRole);

      // Mettre à jour dans Firestore via le service
      await roleService.updateRolePermissions(roleId, newPermissions);

      // Rafraîchir silencieusement les données en arrière-plan
      const refreshedRoles = await roleService.getRoles();
      setRoles(refreshedRoles);
      
      // Mettre à jour le rôle sélectionné si nécessaire
      const refreshedRole = refreshedRoles.find(r => r.id === roleId);
      if (refreshedRole) {
        setSelectedRole(refreshedRole);
      }

    } catch (err: any) {
      console.error('Erreur lors de la mise à jour des permissions:', err);
      setError(`Erreur lors de la mise à jour de la permission : ${err.message}`);
      
      // En cas d'erreur, restaurer l'état précédent
      await loadRoles();
    }
  };

  const handleSaveRole = async () => {
    if (!selectedRole) return;

    try {
      const roleRef = doc(db, 'roles', selectedRole.id);
      await updateDoc(roleRef, {
        name: selectedRole.name,
        description: selectedRole.description,
        permissions: selectedRole.permissions
      });

      setRoles(prev => prev.map(role => 
        role.id === selectedRole.id ? selectedRole : role
      ));
      
      alert('Rôle mis à jour avec succès');
    } catch (err) {
      setError('Erreur lors de la sauvegarde du rôle');
    }
  };

  const handleCancelEdit = () => {
    if (selectedRole) {
      // Restaurer l'état original du rôle
      setSelectedRole(roles.find(r => r.id === selectedRole.id) || null);
    }
  };

  const handleAddRole = () => {
    setIsAddingRole(true);
    setNewRole({
      id: '',
      name: '',
      description: '',
      permissions: []
    });
  };

  const handleSaveNewRole = async () => {
    if (!newRole.name || !newRole.description) {
      setError('Le nom et la description sont requis');
      return;
    }

    try {
      const roleId = newRole.name.toLowerCase().replace(/\s+/g, '_');
      const roleToSave = {
        ...newRole,
        id: roleId
      };

      const roleRef = doc(db, 'roles', roleId);
      await setDoc(roleRef, roleToSave);

      setRoles([...roles, roleToSave]);
      setIsAddingRole(false);
      setNewRole({
        id: '',
        name: '',
        description: '',
        permissions: []
      });
    } catch (err) {
      setError('Erreur lors de la création du rôle');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) {
      return;
    }

    try {
      const roleRef = doc(db, 'roles', roleId);
      await deleteDoc(roleRef);
      setRoles(roles.filter(role => role.id !== roleId));
      setSelectedRole(null);
    } catch (err) {
      setError('Erreur lors de la suppression du rôle');
    }
  };

  const togglePageAccess = (pageName: 'dashboard' | 'userManagement' | 'shipmentTracking' | 'reports' | 'settings') => {
    // Implementation of togglePageAccess
  };

  const handleSavePageAccess = async () => {
    if (!selectedRole) return;

    try {
      const roleService = RoleService.getInstance();
      await roleService.updatePageAccess(selectedRole.id, selectedRole.pageAccess);
      alert('Accès aux pages mis à jour avec succès !');
    } catch (error) {
      console.error('Erreur lors de la mise à jour des accès:', error);
      alert('Erreur lors de la mise à jour des accès.');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des rôles...</p>
      </div>
    );
  }

  return (
    <div className="role-management">
      <div className="roles-header">
        <h1>Gestion des Rôles et Permissions</h1>
        <button className="add-role-button" onClick={handleAddRole}>
          Ajouter un nouveau rôle
        </button>
      </div>

      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          Permissions
        </button>
        <button 
          className={`tab-button ${activeTab === 'pageAccess' ? 'active' : ''}`}
          onClick={() => setActiveTab('pageAccess')}
        >
          Accès aux pages
        </button>
      </div>

      {/* Afficher le contenu en fonction de l'onglet actif */}
      {activeTab === 'permissions' ? (
        <div className="permissions-content">
          <div className="roles-list">
            <div className="roles-header">
              <h3>Rôles disponibles</h3>
            </div>
            <div className="roles-grid">
              {roles.map(role => (
                <div
                  key={role.id}
                  className={`role-card ${selectedRole?.id === role.id ? 'selected' : ''}`}
                  onClick={() => handleRoleSelect(role)}
                >
                  <h4>{role.name}</h4>
                  <p>{role.description}</p>
                  <div className="permission-count">
                    {role.permissions.length} permissions
                  </div>
                  {role.isDefault ? (
                    <div className="default-badge">
                      Rôle par défaut
                    </div>
                  ) : (
                    <button
                      className="delete-role-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRole(role.id);
                      }}
                      title="Supprimer ce rôle"
                      aria-label="Supprimer ce rôle"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isAddingRole ? (
            <div className="role-details">
              <div className="role-header">
                <h3>Nouveau rôle</h3>
                <div className="edit-actions">
                  <button 
                    className="save-button"
                    onClick={handleSaveNewRole}
                  >
                    <i className="fas fa-save"></i> Enregistrer
                  </button>
                  <button 
                    className="cancel-button"
                    onClick={() => setIsAddingRole(false)}
                  >
                    <i className="fas fa-times"></i> Annuler
                  </button>
                </div>
              </div>

              <div className="role-form">
                <div className="form-group">
                  <label>Nom du rôle</label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                    placeholder="Nom du rôle"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                    placeholder="Description du rôle"
                  />
                </div>
              </div>

              <div className="permissions-section">
                <h4>Permissions</h4>
                {Object.entries(
                  DEFAULT_PERMISSIONS.reduce((acc, permission) => {
                    if (!acc[permission.category]) {
                      acc[permission.category] = [];
                    }
                    acc[permission.category].push(permission);
                    return acc;
                  }, {} as { [key: string]: Permission[] })
                ).map(([category, permissions]) => (
                  <div key={category} className="permission-category">
                    <h5>{category}</h5>
                    <div className="permissions-grid">
                      {permissions.map(permission => (
                        <div
                          key={permission.id}
                          className={`permission-card ${
                            newRole.permissions.includes(permission.id) ? 'active' : ''
                          } editable`}
                          onClick={() => {
                            const newPermissions = newRole.permissions.includes(permission.id)
                              ? newRole.permissions.filter(p => p !== permission.id)
                              : [...newRole.permissions, permission.id];
                            setNewRole({...newRole, permissions: newPermissions});
                          }}
                        >
                          <div className="permission-header">
                            <span className="permission-name">{permission.name}</span>
                            {newRole.permissions.includes(permission.id) && (
                              <i className="fas fa-check"></i>
                            )}
                          </div>
                          <p className="permission-description">
                            {permission.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            selectedRole && (
              <div className="role-details">
                <div className="role-header">
                  <h3>{selectedRole.name}</h3>
                </div>

                <div className="role-description">
                  <p>{selectedRole.description}</p>
                </div>

                <div className="permissions-section">
                  <h4>Permissions</h4>
                  {Object.entries(
                    DEFAULT_PERMISSIONS.reduce((acc, permission) => {
                      if (!acc[permission.category]) {
                        acc[permission.category] = [];
                      }
                      acc[permission.category].push(permission);
                      return acc;
                    }, {} as { [key: string]: Permission[] })
                  ).map(([category, permissions]) => (
                    <div key={category} className="permission-category">
                      <h5>{category}</h5>
                      <div className="permissions-grid">
                        {permissions.map(permission => (
                          <div
                            key={permission.id}
                            className={`permission-card ${
                              selectedRole.permissions.includes(permission.id) ? 'active' : ''
                            } editable`}
                            onClick={(e) => {
                              e.preventDefault();
                              console.log('Clic sur la permission:', permission.id);
                              handlePermissionToggle(selectedRole.id, permission.id);
                            }}
                            title="Cliquer pour activer/désactiver cette permission"
                          >
                            <div className="permission-header">
                              <span className="permission-name">{permission.name}</span>
                              {selectedRole.permissions.includes(permission.id) && (
                                <i className="fas fa-check"></i>
                              )}
                            </div>
                            <p className="permission-description">
                              {permission.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        <PageAccessManagement />
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default RoleManagement; 
