import React, { useState, useEffect } from 'react';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import './PoleFilter.css';

interface PoleFilterProps {
  onPoleChange: (pole: string) => void;
  selectedPole: string;
  label?: string;
  className?: string;
}

const PoleFilter: React.FC<PoleFilterProps> = ({ 
  onPoleChange, 
  selectedPole, 
  label = "Filtrer par pôle", 
  className = "" 
}) => {
  const [poles, setPoles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchPoles();
  }, []);

  const fetchPoles = async () => {
    try {
      setLoading(true);
      
      // Récupérer les pôles depuis la collection dédiée 'poles'
      const polesRef = collection(db, 'poles');
      const snapshot = await getDocs(polesRef);
      
      // Extraire les noms des pôles
      const polesArray = snapshot.docs
        .map(doc => doc.data().nom as string)
        .filter(Boolean) // Filtrer les valeurs nulles ou vides
        .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
      
      console.log('Liste des pôles disponibles:', polesArray);
      setPoles(polesArray);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des pôles:', error);
      setPoles([]);
      setLoading(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newPole = event.target.value as string;
    onPoleChange(newPole);
  };

  return (
    <div className={`pole-filter-container ${className}`}>
      <FormControl fullWidth variant="outlined" size="small">
        <InputLabel id="pole-filter-label">{label}</InputLabel>
        <Select
          labelId="pole-filter-label"
          id="pole-filter"
          value={selectedPole}
          onChange={handleChange as any}
          label={label}
          disabled={loading}
          className="pole-filter-select"
        >
          <MenuItem value="">
            <em>Tous les pôles</em>
          </MenuItem>
          {poles.map((pole) => (
            <MenuItem key={pole} value={pole}>
              {pole}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
};

export default PoleFilter; 
