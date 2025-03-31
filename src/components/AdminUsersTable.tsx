import React, { useState } from 'react';
import { User } from '../types';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import './DataTable.css';
import './EditMode.css';

interface AdminUsersTableProps {
  users: User[];
  onUserUpdated: () => void;
}

const AdminUsersTable: React.FC<AdminUsersTableProps> = ({ users, onUserUpdated }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [poleFilter, setPoleFilter] = useState('');

  // État pour le mode édition et la sélection multiple
  const [editMode, setEditMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Filtrer les utilisateurs
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter ? user.role === roleFilter : true;
    const matchesPole = poleFilter ? user.pole === poleFilter : true;
    
    return matchesSearch && matchesRole && matchesPole;
  });

  // Obtenir les rôles et pôles uniques
  const roles = Array.from(new Set(users.map(u => u.role)));
  const poles = Array.from(new Set(users.filter(u => u.pole).map(u => u.pole)));

  // Supprimer les utilisateurs sélectionnés
  const handleDeleteSelected = async () => {
    if (selectedUsers.length === 0) {
      alert('Veuillez sélectionner au moins un utilisateur à supprimer');
      return;
    }

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedUsers.length} utilisateur(s) ?`)) {
      try {
        // Supprimer les utilisateurs sélectionnés de Firestore
        const deletePromises = selectedUsers.map(id => deleteDoc(doc(db, 'users', id)));
        await Promise.all(deletePromises);
        
        // Mettre à jour l'interface
        onUserUpdated();
        setSelectedUsers([]);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
    if (editMode) {
      // Si on quitte le mode édition, on désélectionne tout
      setSelectedUsers([]);
    }
  };

  const toggleUserSelection = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(userId => userId !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  return (
    <div className="data-table-container">
      <div className="section-header">
        <h1 className="page-title">Gestion des Utilisateurs</h1>
        <div className="header-actions">
          <button className="button" onClick={toggleEditMode}>
            {editMode ? 'Terminer' : 'Modifier'}
          </button>
        </div>
      </div>
      
      {editMode && (
        <div className="edit-actions" style={{ marginBottom: '15px' }}>
          <button 
            className="button button-danger" 
            onClick={handleDeleteSelected}
            disabled={selectedUsers.length === 0}
          >
            <i className="fas fa-trash-alt"></i> Supprimer ({selectedUsers.length})
          </button>
        </div>
      )}
      
      <div className="filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>
        
        <div className="filter-group">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Tous les rôles</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <select
            value={poleFilter}
            onChange={(e) => setPoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Tous les pôles</option>
            {poles.map(pole => (
              <option key={pole} value={pole}>{pole}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {editMode && <th style={{ width: '40px' }}>Sélection</th>}
              <th>Nom</th>
              <th>Prénom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Pôle</th>
              <th>Date de création</th>
              <th>Dernier accès</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className={selectedUsers.includes(user.id) ? 'selected-row' : ''}>
                {editMode && (
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.includes(user.id)} 
                      onChange={() => toggleUserSelection(user.id)}
                    />
                  </td>
                )}
                <td onClick={editMode ? () => toggleUserSelection(user.id) : undefined} style={editMode ? { cursor: 'pointer' } : {}}>
                  {user.nom}
                </td>
                <td onClick={editMode ? () => toggleUserSelection(user.id) : undefined} style={editMode ? { cursor: 'pointer' } : {}}>
                  {user.prenom}
                </td>
                <td onClick={editMode ? () => toggleUserSelection(user.id) : undefined} style={editMode ? { cursor: 'pointer' } : {}}>
                  {user.email}
                </td>
                <td onClick={editMode ? () => toggleUserSelection(user.id) : undefined} style={editMode ? { cursor: 'pointer' } : {}}>
                  {user.role}
                </td>
                <td onClick={editMode ? () => toggleUserSelection(user.id) : undefined} style={editMode ? { cursor: 'pointer' } : {}}>
                  {user.pole || '-'}
                </td>
                <td onClick={editMode ? () => toggleUserSelection(user.id) : undefined} style={editMode ? { cursor: 'pointer' } : {}}>
                  {user.dateCreation}
                </td>
                <td onClick={editMode ? () => toggleUserSelection(user.id) : undefined} style={editMode ? { cursor: 'pointer' } : {}}>
                  {user.dernierAcces || 'Jamais'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsersTable;
