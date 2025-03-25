import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SELAS } from '../types/SELAS';
import { SELASService } from '../services/SELASService';
import { useAuth } from './AuthContext';

// Interface pour le contexte
interface SelasContextType {
  currentSelasId: string | null;
  setCurrentSelasId: (id: string | null) => void;
  availableSelas: SELAS[];
  loading: boolean;
  error: string | null;
}

// Création du contexte avec des valeurs par défaut
const SelasContext = createContext<SelasContextType>({
  currentSelasId: null,
  setCurrentSelasId: () => {},
  availableSelas: [],
  loading: false,
  error: null
});

// Hook pour utiliser le contexte dans les composants
export const useSelasContext = () => useContext(SelasContext);

// Props pour le provider
interface SelasProviderProps {
  children: ReactNode;
}

// Provider du contexte
export const SelasProvider: React.FC<SelasProviderProps> = ({ children }) => {
  const [currentSelasId, setCurrentSelasIdState] = useState<string | null>(
    localStorage.getItem('currentSelasId')
  );
  const [availableSelas, setAvailableSelas] = useState<SELAS[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  
  // Charger la liste des SELAS disponibles uniquement si l'utilisateur est authentifié
  useEffect(() => {
    const fetchSelas = async () => {
      // Si l'utilisateur n'est pas authentifié, ne rien faire
      if (!currentUser) {
        setAvailableSelas([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const selasService = SELASService.getInstance();
        const selasData = await selasService.getSELAS();
        
        // Filtrer uniquement les SELAS actives
        const activeSelas = selasData.filter(sela => sela.active);
        setAvailableSelas(activeSelas);
        
        // Si aucune SELAS active n'est trouvée
        if (activeSelas.length === 0) {
          console.warn("Aucune SELAS active n'a été trouvée!");
          setError("Aucune SELAS active disponible");
        }
        
        // Si l'ID SELAS actuel n'est pas dans la liste des SELAS actives
        if (currentSelasId && !activeSelas.some(sela => sela.id === currentSelasId)) {
          // Si au moins une SELAS active existe, définir la première comme courante
          if (activeSelas.length > 0) {
            setCurrentSelasId(activeSelas[0].id);
          } else {
            // Sinon, effacer l'ID SELAS actuel
            setCurrentSelasId(null);
          }
        }
        
        // Si aucune SELAS n'est sélectionnée et qu'il en existe au moins une
        if (!currentSelasId && activeSelas.length > 0) {
          setCurrentSelasId(activeSelas[0].id);
        }
        
      } catch (error) {
        console.error('Erreur lors du chargement des SELAS:', error);
        setError('Erreur lors du chargement des SELAS');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSelas();
  }, [currentSelasId, currentUser]);
  
  // Fonction pour définir l'ID SELAS actuel
  const setCurrentSelasId = (id: string | null) => {
    if (id) {
      localStorage.setItem('currentSelasId', id);
    } else {
      localStorage.removeItem('currentSelasId');
    }
    setCurrentSelasIdState(id);
  };
  
  // Valeur du contexte
  const value = {
    currentSelasId,
    setCurrentSelasId,
    availableSelas,
    loading,
    error
  };
  
  return (
    <SelasContext.Provider value={value}>
      {children}
    </SelasContext.Provider>
  );
};

export default SelasContext; 
