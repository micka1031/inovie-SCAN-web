import React, { useState, useEffect } from 'react';
import { Role } from '../types/roles';
import { RoleService } from '../services/RoleService';
import './PageAccessManagement.css';

// Mapping des noms de pages en français
const PAGE_LABELS = {
  dashboard: 'Tableau de bord',
  passages: 'Passages',
  sites: 'Sites',
  tournees: 'Tournées',
  vehicules: 'Véhicules',
  carte: 'Carte',
  userManagement: 'Gestion des utilisateurs',
  administration: 'Administration'
};

// Types de pages possibles
const PAGE_TYPES = ['dashboard', 'passages', 'sites', 'tournees', 'vehicules', 'carte', 'userManagement', 'administration'] as const;
type PageKey = typeof PAGE_TYPES[number];

const PageAccessManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [pageAccess, setPageAccess] = useState<{[key in PageKey]?: boolean}>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        const roleService = RoleService.getInstance();
        const fetchedRoles = await roleService.getRoles();
        setRoles(fetchedRoles);
        
        // Sélectionner automatiquement le premier rôle
        if (fetchedRoles.length > 0 && !selectedRole) {
          setSelectedRole(fetchedRoles[0]);
          setPageAccess(fetchedRoles[0].pageAccess || {});
        }
      } catch (error) {
        console.error('Erreur lors du chargement des rôles:', error);
        setMessage({
          text: 'Impossible de charger les rôles. Veuillez réessayer.',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setPageAccess(role.pageAccess || {});
  };

  const togglePageAccess = (pageName: PageKey) => {
    setPageAccess(prev => ({
      ...prev,
      [pageName]: !prev[pageName]
    }));
  };

  const handleSavePageAccess = async () => {
    if (!selectedRole) return;
    
    try {
      setSaving(true);
      const roleService = RoleService.getInstance();
      await roleService.updatePageAccess(selectedRole.id, pageAccess);
      
      // Forcer le rechargement des rôles globaux
      await roleService.refreshRoles();

      // Afficher un message de succès
      setMessage({
        text: 'Accès aux pages mis à jour avec succès ! Veuillez vous déconnecter et vous reconnecter pour que les changements prennent effet.',
        type: 'success'
      });
      
      // Mettre à jour le rôle sélectionné avec les nouveaux accès
      const updatedRole = { ...selectedRole, pageAccess };
      setSelectedRole(updatedRole);
      
      // Mettre à jour la liste des rôles
      setRoles(prevRoles => 
        prevRoles.map(role => 
          role.id === updatedRole.id ? updatedRole : role
        )
      );
      
      // Cacher le message après 5 secondes
      setTimeout(() => {
        setMessage(null);
      }, 5000);
    } catch (error) {
      console.error("Erreur lors de la mise à jour des accès aux pages:", error);
      setMessage({
        text: 'Erreur lors de la mise à jour des accès aux pages.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page-access-loading">Chargement des rôles...</div>;
  }

  return (
    <div className="page-access-container">
      <div className="page-access-header">
        <h1>Gestion des Accès aux Pages</h1>
        <p>Configurez les autorisations d'accès pour chaque rôle</p>
      </div>

      <div className="page-access-content">
        <div className="role-selector">
          <h3>Sélectionnez un rôle</h3>
          <div className="role-buttons">
            {roles.map(role => (
              <button 
                key={role.id} 
                className={`role-button ${selectedRole?.id === role.id ? 'active' : ''}`}
                onClick={() => handleRoleSelect(role)}
              >
                {role.name}
                {role.isAdmin && <span className="admin-badge">Admin</span>}
              </button>
            ))}
          </div>
        </div>

        {selectedRole && (
          <div className="page-access-panel">
            <h2>Accès aux pages pour {selectedRole.name}</h2>
            
            <div className="page-access-cards">
              {PAGE_TYPES.map(pageKey => (
                <div key={pageKey} className="page-card">
                  <div className="page-card-content">
                    <div className="page-name">{PAGE_LABELS[pageKey]}</div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={pageAccess[pageKey] || false}
                        onChange={() => togglePageAccess(pageKey)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="action-buttons">
              <button 
                className="save-button" 
                onClick={handleSavePageAccess}
                disabled={saving}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les accès'}
              </button>
            </div>
            
            {message && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageAccessManagement;
