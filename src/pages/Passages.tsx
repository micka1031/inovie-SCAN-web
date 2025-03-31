import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

// Fonctions de récupération des données avec logs de débogage
const fetchPassages = async (currentUser: any) => {
  try {
    console.log('🔍 Tentative de récupération des passages');
    console.log('👤 Utilisateur connecté :', currentUser);
    
    const passagesRef = collection(db, 'passages');
    const q = query(passagesRef);
    
    const querySnapshot = await getDocs(q);
    const passagesData = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('✅ Passages récupérés avec succès :', passagesData);
    return passagesData;
  } catch (error) {
    console.error('🚨 Erreur lors de la récupération des passages:', error);
    // En mode développement, retourner des données de test
    if (import.meta.env.DEV) {
      const testPassages = [
        { id: 'test1', nom: 'Passage Test 1' },
        { id: 'test2', nom: 'Passage Test 2' }
      ];
      console.warn('🛠️ Mode développement : Utilisation de données de test');
      return testPassages;
    }
    throw error;
  }
};

const fetchVehicules = async (currentUser: any) => {
  try {
    console.log('🔍 Tentative de récupération des véhicules');
    console.log('👤 Utilisateur connecté :', currentUser);
    
    const vehiculesRef = collection(db, 'vehicules');
    const q = query(vehiculesRef);
    
    const querySnapshot = await getDocs(q);
    const vehiculesData = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('✅ Véhicules récupérés avec succès :', vehiculesData);
    return vehiculesData;
  } catch (error) {
    console.error('🚨 Erreur lors de la récupération des véhicules:', error);
    // En mode développement, retourner des données de test
    if (import.meta.env.DEV) {
      const testVehicules = [
        { id: 'test1', nom: 'Véhicule Test 1' },
        { id: 'test2', nom: 'Véhicule Test 2' }
      ];
      console.warn('🛠️ Mode développement : Utilisation de données de test');
      return testVehicules;
    }
    throw error;
  }
};

const fetchSites = async (currentUser: any) => {
  try {
    console.log('🔍 Tentative de récupération des sites');
    console.log('👤 Utilisateur connecté :', currentUser);
    
    const sitesRef = collection(db, 'sites');
    const q = query(sitesRef);
    
    const querySnapshot = await getDocs(q);
    const sitesData = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('✅ Sites récupérés avec succès :', sitesData);
    return sitesData;
  } catch (error) {
    console.error('🚨 Erreur lors de la récupération des sites:', error);
    // En mode développement, retourner des données de test
    if (import.meta.env.DEV) {
      const testSites = [
        { id: 'test1', nom: 'Site Test 1' },
        { id: 'test2', nom: 'Site Test 2' }
      ];
      console.warn('🛠️ Mode développement : Utilisation de données de test');
      return testSites;
    }
    throw error;
  }
};

const fetchTournees = async (currentUser: any) => {
  try {
    console.log('🔍 Tentative de récupération des tournées');
    console.log('👤 Utilisateur connecté :', currentUser);
    
    const tourneesRef = collection(db, 'tournees');
    const q = query(tourneesRef);
    
    const querySnapshot = await getDocs(q);
    const tourneesData = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('✅ Tournées récupérées avec succès :', tourneesData);
    return tourneesData;
  } catch (error) {
    console.error('🚨 Erreur lors de la récupération des tournées:', error);
    // En mode développement, retourner des données de test
    if (import.meta.env.DEV) {
      const testTournees = [
        { id: 'test1', nom: 'Tournée Test 1' },
        { id: 'test2', nom: 'Tournée Test 2' }
      ];
      console.warn('🛠️ Mode développement : Utilisation de données de test');
      return testTournees;
    }
    throw error;
  }
}; 
