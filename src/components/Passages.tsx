import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import DatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import fr from 'date-fns/locale/fr';
import "react-datepicker/dist/react-datepicker.css";
import './Passages.css';
import './EditMode.css';
import { usePoles } from '../services/PoleService';
import PoleSelector from './PoleSelector';
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

// Enregistrer la locale française
registerLocale('fr', fr);

// Styles personnalisés pour le datepicker
const datepickerStyles = `
  .react-datepicker {
    font-family: 'Roboto', sans-serif;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border: 1px solid #e0e0e0;
    z-index: 1000;
  }
  
  .react-datepicker-popper {
    z-index: 1000;
  }
  
  .react-datepicker__header {
    background-color: #1976d2;
    border-bottom: none;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    padding-top: 10px;
  }
  
  .react-datepicker__current-month {
    color: white;
    font-weight: 500;
    font-size: 1rem;
    padding-bottom: 5px;
  }
  
  .react-datepicker__day-name {
    color: white;
    font-weight: 500;
  }
  
  .react-datepicker__day--selected {
    background-color: #1976d2;
    border-radius: 50%;
  }
  
  .react-datepicker__day:hover {
    background-color: #e8f0fe;
    border-radius: 50%;
  }
  
  .react-datepicker__day--keyboard-selected {
    background-color: #e8f0fe;
    color: #1976d2;
    border-radius: 50%;
  }
  
  .react-datepicker__navigation {
    top: 12px;
  }
  
  .react-datepicker__navigation-icon::before {
    border-color: white;
  }
  
  .react-datepicker__day--today {
    font-weight: bold;
    color: #1976d2;
  }
  
  .custom-datepicker-input {
    width: 160px;
    padding: 10px 12px;
    border-radius: 4px;
    border: 1px solid #ccc;
    font-size: 14px;
    cursor: pointer;
    background-color: white;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .custom-datepicker-input:focus {
    outline: none;
    border-color: #1976d2;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
  }
  
  .custom-datepicker-input::placeholder {
    color: #aaa;
  }
  
  .custom-datepicker-wrapper {
    position: relative;
  }
  
  .custom-datepicker-icon {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #666;
    pointer-events: none;
  }
`;

interface Passage {
  id: string;
  siteDepart: string;
  dateHeureDepart: Timestamp | any; // Accepter différents formats pour la compatibilité
  idColis: string;
  statut: 'Livré' | 'En cours';
  siteFin?: string;
  dateHeureFin?: Timestamp | any; // Accepter différents formats pour la compatibilité
  coursierChargement?: string;
  coursierLivraison?: string;
  vehiculeId?: string;
  tourneeId?: string;
  heureDebut?: string;
  heureFin?: string;
  pole?: string;
}

interface Tournee {
  id: string;
  nom: string;
  date: Timestamp;
  heureDepart: string;
  heureFinPrevue: string;
  heureFinReelle?: string;
  coursier: string;
  vehicule: string;
  nombreColis: number;
  statut: 'en_attente' | 'en_cours' | 'terminee' | 'annulee';
  siteDepart: string;
}

interface Site {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  codePostal: string;
  telephone: string;
  email: string;
  type: string;
  statut: 'actif' | 'inactif';
}

interface Vehicule {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  type: string;
  annee: number;
  statut: 'actif' | 'maintenance' | 'inactif';
  dernierEntretien?: string;
  coursierAssigne?: string;
  kilometrage: number;
}

// Définition d'une interface pour les colonnes du tableau
interface ColumnDefinition {
  id: string;
  label: string;
  visible: boolean;
  width: string;
}

// Définition des colonnes par défaut
const DEFAULT_COLUMNS: ColumnDefinition[] = [
  { id: 'pole', label: 'Pôle', visible: true, width: '80px' },
  { id: 'siteDepart', label: 'Site de départ', visible: true, width: '150px' },
  { id: 'date', label: 'Date', visible: true, width: '100px' },
  { id: 'heure', label: 'Heure', visible: true, width: '80px' },
  { id: 'statut', label: 'Statut', visible: true, width: '100px' },
  { id: 'siteFin', label: 'Site d\'arrivée', visible: true, width: '150px' },
  { id: 'vehicule', label: 'Véhicule', visible: true, width: '120px' },
  { id: 'coursier', label: 'Coursier', visible: true, width: '120px' },
  { id: 'commentaire', label: 'Commentaire', visible: true, width: '150px' }
];

const Passages: React.FC = () => {
  // États principaux
  const [passages, setPassages] = useState<Passage[]>([]);
  const [allPassages, setAllPassages] = useState<Passage[]>([]);
  const [passagesFiltered, setPassagesFiltered] = useState<Passage[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tournees, setTournees] = useState<Tournee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  
  // Filtres
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [tourneeFilter, setTourneeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [siteFilter, setSiteFilter] = useState<string>('');
  const [vehiculeFilter, setVehiculeFilter] = useState<string>('');
  const [idColisFilter, setIdColisFilter] = useState<string>('');
  
  // Recherche rapide
  const [quickSearch, setQuickSearch] = useState<string>('');
  const [filteredPassages, setFilteredPassages] = useState<Passage[]>([]);

  // Ajout du filtre par pôle
  const [selectedPole, setSelectedPole] = useState<string>('');

  // Ajout des états pour le mode édition et la sélection multiple
  const [editMode, setEditMode] = useState(false);
  const [selectedPassages, setSelectedPassages] = useState<string[]>([]);
  const [editingPassages, setEditingPassages] = useState<{[key: string]: Passage}>({});

  // Utilisation du hook usePoles
  const { poles } = usePoles();

  // État pour le dialogue de colonnes
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);

  // État pour les définitions de colonnes avec chargement depuis localStorage
  const [columns, setColumns] = useState<ColumnDefinition[]>(() => {
    // Essayer de charger les colonnes depuis localStorage
    try {
      const savedColumns = localStorage.getItem('passagesColumns');
      if (savedColumns) {
        return JSON.parse(savedColumns);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des colonnes:', error);
    }
    // Si aucune colonne n'est enregistrée ou en cas d'erreur, utiliser les valeurs par défaut
    return DEFAULT_COLUMNS;
  });

  // État pour le menu d'actions
  const [modifyMenuOpen, setModifyMenuOpen] = useState(false);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);

  // Fonction pour basculer l'état du menu déroulant
  const handleToggleModifyMenu = () => {
    setModifyMenuOpen(!modifyMenuOpen);
  };

  // Fonction pour gérer les clics en dehors du menu déroulant
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (menuButtonRef.current && !menuButtonRef.current.contains(event.target as Node)) {
      setModifyMenuOpen(false);
    }
  }, []);

  // Ajouter et supprimer les écouteurs d'événements
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  useEffect(() => {
    fetchPassages();
    fetchTournees();
    fetchSites();
    fetchVehicules();
    
    // Ajouter l'attribut lang="fr" au document pour les calendriers en français
    document.documentElement.lang = 'fr';
    
    // Ajouter les styles personnalisés pour le datepicker
    const styleElement = document.createElement('style');
    styleElement.textContent = datepickerStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      // Nettoyage
      document.documentElement.lang = '';
      document.head.removeChild(styleElement);
    };
  }, []);

  // Initialiser les passages filtrés au chargement
  useEffect(() => {
    setFilteredPassages(passages);
  }, [passages]);

  // Effet pour filtrer les passages en fonction de la recherche rapide et du pôle sélectionné
  useEffect(() => {
    let results = passages;

    // Filtrer par pôle si un pôle est sélectionné
    if (selectedPole) {
      results = results.filter(passage => passage.pole === selectedPole);
    }

    // Ensuite filtrer par recherche rapide
    if (quickSearch.trim()) {
      const searchTerm = quickSearch.toLowerCase().trim();
      results = results.filter(passage => {
        // Rechercher dans tous les champs textuels du passage
        return (
          getSiteName(passage.siteDepart).toLowerCase().includes(searchTerm) ||
          getSiteName(passage.siteFin || '').toLowerCase().includes(searchTerm) ||
          passage.idColis.toLowerCase().includes(searchTerm) ||
          passage.statut.toLowerCase().includes(searchTerm) ||
          (passage.coursierChargement || '').toLowerCase().includes(searchTerm) ||
          (passage.coursierLivraison || '').toLowerCase().includes(searchTerm) ||
          getTourneeName(passage.tourneeId).toLowerCase().includes(searchTerm) ||
          getVehiculeImmatriculation(passage.vehiculeId).toLowerCase().includes(searchTerm) ||
          formatDateFr(convertTimestampToDate(passage.dateHeureDepart)).includes(searchTerm)
        );
      });
    }

    setFilteredPassages(results);
  }, [quickSearch, passages, selectedPole]);

  // Fonction pour convertir un Timestamp Firebase en Date JavaScript
  const convertTimestampToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    
    // Si c'est déjà un objet Date
    if (timestamp instanceof Date) return timestamp;
    
    // Si c'est un Timestamp Firebase avec la méthode toDate()
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // Si c'est un objet avec seconds et nanoseconds (format Firestore)
    if (timestamp && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
      return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    }
    
    // Si c'est un nombre (timestamp en millisecondes)
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    // Si c'est une chaîne de caractères
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    
    console.error('Format de timestamp non reconnu:', timestamp);
    return null;
  };

  // Fonction pour comparer uniquement les dates (sans l'heure)
  const compareDatesOnly = (date1: Date | null, date2: Date | null): boolean => {
    if (!date1 || !date2) return false;
    
    // Créer de nouvelles dates avec uniquement l'année, le mois et le jour
    const onlyDate1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const onlyDate2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    
    // Comparer les timestamps (en millisecondes)
    return onlyDate1.getTime() === onlyDate2.getTime();
  };
  
  // Fonction pour vérifier si une date est supérieure ou égale à une autre (sans l'heure)
  const isDateGreaterOrEqual = (date1: Date | null, date2: Date | null): boolean => {
    if (!date1 || !date2) return false;
    
    // Créer de nouvelles dates avec uniquement l'année, le mois et le jour
    const onlyDate1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const onlyDate2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    
    // Comparer les timestamps (en millisecondes)
    return onlyDate1.getTime() >= onlyDate2.getTime();
  };
  
  // Fonction pour vérifier si une date est inférieure ou égale à une autre (sans l'heure)
  const isDateLessOrEqual = (date1: Date | null, date2: Date | null): boolean => {
    if (!date1 || !date2) return false;
    
    // Créer de nouvelles dates avec uniquement l'année, le mois et le jour
    const onlyDate1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const onlyDate2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    
    // Comparer les timestamps (en millisecondes)
    return onlyDate1.getTime() <= onlyDate2.getTime();
  };

  const fetchPassages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const passagesRef = collection(db, 'passages');
      const passagesSnap = await getDocs(passagesRef);
      const passagesData = passagesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAllPassages(passagesData as Passage[]);
      setPassages(passagesData as Passage[]);
      setPassagesFiltered(passagesData as Passage[]);
    } catch (err) {
      console.error('Erreur lors de la récupération des passages:', err);
      setError('Erreur lors du chargement des passages. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fonction pour récupérer les tournées depuis Firebase
  const fetchTournees = async () => {
    try {
      const tourneesRef = collection(db, 'tournees');
      const snapshot = await getDocs(tourneesRef);
      
      if (!snapshot.empty) {
        const tourneesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nom: data.nom || '',
            date: data.date || Timestamp.fromDate(new Date()),
            heureDepart: data.heureDepart || '',
            heureFinPrevue: data.heureFinPrevue || '',
            heureFinReelle: data.heureFinReelle || '',
            coursier: data.coursier || '',
            vehicule: data.vehicule || '',
            nombreColis: data.nombreColis || 0,
            statut: data.statut || 'en_attente',
            siteDepart: data.siteDepart || ''
          } as Tournee;
        });
        
        setTournees(tourneesData);
      } else {
        console.log("Aucune tournée trouvée dans Firebase");
        // Définir quelques tournées par défaut si aucune n'est trouvée
        const defaultTournees = [
          {
            id: '1',
            nom: 'Matin',
            date: Timestamp.fromDate(new Date()),
            heureDepart: '07:00',
            heureFinPrevue: '12:00',
            coursier: 'Sébastien Lherlier',
            vehicule: 'GE-695-RT',
            nombreColis: 15,
            statut: 'en_attente' as const,
            siteDepart: 'Laboratoire Central'
          },
          {
            id: '2',
            nom: 'Jour',
            date: Timestamp.fromDate(new Date()),
            heureDepart: '12:00',
            heureFinPrevue: '17:00',
            coursier: 'Guillaume Sage',
            vehicule: 'GI-456-AD',
            nombreColis: 12,
            statut: 'en_attente' as const,
            siteDepart: 'Laboratoire Purpan'
          },
          {
            id: '3',
            nom: 'Soir',
            date: Timestamp.fromDate(new Date()),
            heureDepart: '17:00',
            heureFinPrevue: '22:00',
            coursier: 'Sébastien Lherlier',
            vehicule: 'GE-695-RT',
            nombreColis: 10,
            statut: 'en_attente' as const,
            siteDepart: 'Laboratoire Central'
          }
        ];
        setTournees(defaultTournees);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des tournées:', error);
    }
  };

  // Fonction pour récupérer les sites depuis Firebase
  const fetchSites = async () => {
    try {
      const sitesRef = collection(db, 'sites');
      const snapshot = await getDocs(sitesRef);
      
      if (!snapshot.empty) {
        const sitesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nom: data.nom || '',
            adresse: data.adresse || '',
            ville: data.ville || '',
            codePostal: data.codePostal || '',
            telephone: data.telephone || '',
            email: data.email || '',
            type: data.type || '',
            statut: data.statut || 'actif'
          } as Site;
        });
        
        setSites(sitesData);
      } else {
        console.log("Aucun site trouvé dans Firebase");
        // Définir quelques sites par défaut si aucun n'est trouvé
        const defaultSites = [
          {
            id: '1',
            nom: 'Laboratoire Central',
            adresse: '15 rue des Sciences',
            ville: 'Toulouse',
            codePostal: '31000',
            telephone: '05.61.XX.XX.XX',
            email: 'contact@labo-central.fr',
            type: 'Laboratoire',
            statut: 'actif' as const
          },
          {
            id: '2',
            nom: 'Laboratoire Purpan',
            adresse: '330 avenue de Grande Bretagne',
            ville: 'Toulouse',
            codePostal: '31300',
            telephone: '05.61.XX.XX.XX',
            email: 'contact@labo-purpan.fr',
            type: 'Laboratoire',
            statut: 'actif' as const
          }
        ];
        setSites(defaultSites);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des sites:', error);
    }
  };

  // Fonction pour récupérer les véhicules depuis Firebase
  const fetchVehicules = async () => {
    try {
      const vehiculesRef = collection(db, 'vehicules');
      const snapshot = await getDocs(vehiculesRef);
      
      if (!snapshot.empty) {
        const vehiculesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            immatriculation: data.immatriculation || '',
            marque: data.marque || '',
            modele: data.modele || '',
            type: data.type || '',
            annee: data.annee || 2023,
            statut: data.statut || 'actif',
            dernierEntretien: data.dernierEntretien || '',
            coursierAssigne: data.coursierAssigne || '',
            kilometrage: data.kilometrage || 0
          } as Vehicule;
        });
        
        setVehicules(vehiculesData);
      } else {
        console.log("Aucun véhicule trouvé dans Firebase");
        // Définir quelques véhicules par défaut si aucun n'est trouvé
        const defaultVehicules = [
          {
            id: '1',
            immatriculation: 'GE-695-RT',
            marque: 'Renault',
            modele: 'Kangoo',
            type: 'Utilitaire',
            annee: 2020,
            statut: 'actif' as const,
            dernierEntretien: '2023-01-15',
            coursierAssigne: 'Sébastien Lherlier',
            kilometrage: 45000
          },
          {
            id: '2',
            immatriculation: 'GI-456-AD',
            marque: 'Citroën',
            modele: 'Berlingo',
            type: 'Utilitaire',
            annee: 2021,
            statut: 'actif' as const,
            dernierEntretien: '2023-02-10',
            coursierAssigne: 'Guillaume Sage',
            kilometrage: 32500
          }
        ];
        setVehicules(defaultVehicules);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des véhicules:', error);
    }
  };

  // Fonction pour obtenir le nom de la tournée à partir de son ID
  const getTourneeName = (tourneeId: string | undefined): string => {
    if (!tourneeId) return '';
    const foundTournee = tournees.find(t => t.id === tourneeId);
    return foundTournee ? foundTournee.nom : tourneeId;
  };

  // Fonction pour obtenir le nom du site à partir de son ID
  const getSiteName = (siteId: string | undefined): string => {
    if (!siteId) return '';
    const foundSite = sites.find(s => s.id === siteId);
    return foundSite ? foundSite.nom : siteId;
  };

  // Fonction pour obtenir l'immatriculation du véhicule à partir de son ID
  const getVehiculeImmatriculation = (vehiculeId: string | undefined): string => {
    if (!vehiculeId) return '';
    const foundVehicule = vehicules.find(v => v.id === vehiculeId);
    return foundVehicule ? foundVehicule.immatriculation : vehiculeId;
  };

  // Fonction pour formater une date au format français (JJ/MM/AAAA)
  const formatDateFr = (date: Date | null): string => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Fonction pour obtenir le nom du pôle
  const getPoleNameById = (poleId: string | undefined): string => {
    if (!poleId) return '-';
    const pole = poles.find(p => p.id === poleId);
    return pole ? pole.nom : poleId;
  };

  // Fonction pour gérer le changement de pôle
  const handlePoleChange = (pole: string) => {
    setSelectedPole(pole);
  };

  // Appliquer les filtres
  const applyFilters = () => {
    setAppliedFilters(true);
    
    let filteredResults = [...allPassages];
    
    // Appliquer la recherche rapide
    if (quickSearch) {
      filteredResults = filteredResults.filter(passage => {
        const searchLower = quickSearch.toLowerCase();
        return (
          passage.siteDepart?.toLowerCase().includes(searchLower) ||
          passage.siteFin?.toLowerCase().includes(searchLower) ||
          passage.courrier?.toLowerCase().includes(searchLower) ||
          passage.vehicule?.toLowerCase().includes(searchLower) ||
          passage.idColis?.toLowerCase().includes(searchLower) ||
          passage.commentaire?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Filtrer par pôle
    if (selectedPole) {
      filteredResults = filteredResults.filter(passage => passage.pole === selectedPole);
    }
    
    // Filtrer par date de début
    if (startDate) {
      filteredResults = filteredResults.filter(passage => {
        const passageDate = convertTimestampToDate(passage.dateHeureDepart);
        return passageDate && isDateGreaterOrEqual(passageDate, new Date(startDate));
      });
    }
    
    // Filtrer par date de fin
    if (endDate) {
      filteredResults = filteredResults.filter(passage => {
        const passageDate = convertTimestampToDate(passage.dateHeureDepart);
        return passageDate && isDateLessOrEqual(passageDate, new Date(endDate));
      });
    }
    
    // Filtrer par tournée
    if (tourneeFilter) {
      filteredResults = filteredResults.filter(passage => passage.tourneeId === tourneeFilter);
    }
    
    // Filtrer par statut
    if (statusFilter) {
      filteredResults = filteredResults.filter(passage => passage.statut === statusFilter);
    }
    
    // Filtrer par site
    if (siteFilter) {
      filteredResults = filteredResults.filter(passage => passage.siteDepart === siteFilter || passage.siteFin === siteFilter);
    }
    
    // Filtrer par véhicule
    if (vehiculeFilter) {
      filteredResults = filteredResults.filter(passage => passage.vehiculeId === vehiculeFilter);
    }
    
    // Filtrer par ID de colis
    if (idColisFilter) {
      filteredResults = filteredResults.filter(passage => 
        passage.idColis && passage.idColis.toLowerCase().includes(idColisFilter.toLowerCase())
      );
    }
    
    setPassagesFiltered(filteredResults);
    console.log(`Filtres appliqués: ${filteredResults.length} passages trouvés`);
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setTourneeFilter('');
    setStatusFilter('');
    setSiteFilter('');
    setVehiculeFilter('');
    setIdColisFilter('');
    setQuickSearch('');
    setSelectedPole('');
    setFilteredPassages(passages);
  };

  // Ajout de la fonction pour supprimer les passages sélectionnés
  const handleDeleteSelected = async () => {
    if (selectedPassages.length === 0) {
      alert('Veuillez sélectionner au moins un passage à supprimer');
      return;
    }

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedPassages.length} passage(s) ?`)) {
      try {
        // Supprimer les passages sélectionnés de Firestore
        const deletePromises = selectedPassages.map(id => deleteDoc(doc(db, 'passages', id)));
        await Promise.all(deletePromises);
        
        // Mettre à jour l'état local
        setPassages(passages.filter(passage => !selectedPassages.includes(passage.id)));
        setSelectedPassages([]);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        setError('Erreur lors de la suppression');
      }
    }
  };

  // Fonction pour basculer le mode édition
  const toggleEditMode = () => {
    if (!editMode) {
      // Si on entre en mode édition, initialiser l'état d'édition avec les passages actuels
      console.log("Entrée en mode édition");
      const initialEditState: {[key: string]: Passage} = {};
      passages.forEach(passage => {
        initialEditState[passage.id] = {...passage};
      });
      setEditingPassages(initialEditState);
      // Activer le mode édition
      setEditMode(true);
    } else {
      // Si on quitte le mode édition, demander confirmation
      if (window.confirm("Voulez-vous enregistrer les modifications ?")) {
        console.log("Sauvegarde des modifications avant de quitter le mode édition");
        // Sauvegarder les modifications et quitter le mode édition après la sauvegarde
        saveAllChanges().then(() => {
          // Désélectionner tout et quitter le mode édition
          setSelectedPassages([]);
          setEditMode(false);
        }).catch(error => {
          console.error("Erreur lors de la sauvegarde:", error);
          // Laisser l'utilisateur en mode édition en cas d'erreur
          alert("Une erreur est survenue lors de la sauvegarde. Veuillez réessayer.");
        });
      } else {
        console.log("Annulation des modifications et sortie du mode édition");
        // Annuler les modifications et quitter le mode édition
        setEditingPassages({});
        setSelectedPassages([]);
        setEditMode(false);
      }
    }
  };

  // Fonction pour sauvegarder toutes les modifications
  const saveAllChanges = async () => {
    try {
      console.log("Début de la sauvegarde des modifications...");
      console.log("Passages à mettre à jour:", Object.keys(editingPassages).length);
      
      // Parcourir tous les passages modifiés et les mettre à jour dans Firestore
      const updatePromises = Object.entries(editingPassages).map(async ([id, passage]) => {
        try {
          console.log(`Mise à jour du passage ${id}:`, passage);
          
          // Créer un objet avec uniquement les champs définis
          const updateData: Partial<Passage> = {};
          
          // Vérifier et ajouter chaque champ s'il est défini
          if (passage.siteDepart !== undefined) updateData.siteDepart = passage.siteDepart;
          if (passage.dateHeureDepart !== undefined) updateData.dateHeureDepart = passage.dateHeureDepart;
          if (passage.idColis !== undefined) updateData.idColis = passage.idColis;
          if (passage.statut !== undefined) updateData.statut = passage.statut;
          if (passage.siteFin !== undefined) updateData.siteFin = passage.siteFin;
          if (passage.dateHeureFin !== undefined) updateData.dateHeureFin = passage.dateHeureFin;
          if (passage.coursierChargement !== undefined) updateData.coursierChargement = passage.coursierChargement;
          if (passage.coursierLivraison !== undefined) updateData.coursierLivraison = passage.coursierLivraison;
          if (passage.vehiculeId !== undefined) updateData.vehiculeId = passage.vehiculeId;
          if (passage.tourneeId !== undefined) updateData.tourneeId = passage.tourneeId;
          if (passage.pole !== undefined) updateData.pole = passage.pole;

          await updateDoc(doc(db, 'passages', id), updateData);
          console.log(`Passage ${id} mis à jour avec succès`);
          return id;
        } catch (error) {
          console.error(`Erreur lors de la mise à jour du passage ${id}:`, error);
          throw error;
        }
      });
      
      // Attendre que toutes les opérations soient terminées
      const results = await Promise.allSettled(updatePromises);
      
      // Vérifier les résultats
      const fulfilled = results.filter(result => result.status === 'fulfilled').length;
      const rejected = results.filter(result => result.status === 'rejected').length;
      
      console.log(`Opérations terminées: ${fulfilled} réussies, ${rejected} échouées`);
      
      if (rejected > 0) {
        console.warn("Certaines opérations ont échoué. Voir les erreurs ci-dessus.");
      }
      
      // Mettre à jour l'état local avec les passages modifiés
      setPassages(passages.map(passage => {
        if (editingPassages[passage.id]) {
          return editingPassages[passage.id];
        }
        return passage;
      }));
      
      // Rafraîchir les données
      await fetchPassages();
      
      // Réinitialiser les états
      setEditingPassages({});
      
      if (rejected > 0) {
        alert(`Modifications partiellement enregistrées. ${rejected} opérations ont échoué.`);
      } else {
        alert('Modifications enregistrées avec succès');
      }
      
      console.log('Toutes les modifications ont été enregistrées avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des modifications:', error);
      alert('Erreur lors de la sauvegarde des modifications. Veuillez réessayer.');
      throw error;
    }
  };

  // Fonction pour gérer les changements de valeur dans les champs d'édition
  const handleCellChange = (id: string, field: keyof Passage, value: any) => {
    setEditingPassages({
      ...editingPassages,
      [id]: {
        ...editingPassages[id],
        [field]: value
      }
    });
  };

  // Fonction pour formater une date pour l'input de type date
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fonction pour convertir un Timestamp en format d'heure pour input time
  const convertTimestampToTime = (timestamp: any): string => {
    const date = convertTimestampToDate(timestamp);
    if (!date) return '';
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
  };

  // Fonction pour sélectionner/désélectionner un passage
  const togglePassageSelection = (id: string) => {
    if (selectedPassages.includes(id)) {
      setSelectedPassages(selectedPassages.filter(passageId => passageId !== id));
    } else {
      setSelectedPassages([...selectedPassages, id]);
    }
  };

  // Fonction pour ouvrir le dialogue de colonnes
  const handleOpenColumnDialog = () => {
    setColumnDialogOpen(true);
  };

  // Fonction pour fermer le dialogue de colonnes
  const handleCloseColumnDialog = () => {
    // Sauvegarder les colonnes dans localStorage lors de la fermeture du dialogue
    try {
      localStorage.setItem('passagesColumns', JSON.stringify(columns));
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
        localStorage.setItem('passagesColumns', JSON.stringify(newColumns));
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
      localStorage.setItem('passagesColumns', JSON.stringify(resetColumns));
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
        localStorage.setItem('passagesColumns', JSON.stringify(newColumns));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des colonnes:', error);
      }
      
      return newColumns;
    });
  };

  // Fonction pour enregistrer les modifications
  const saveChanges = () => {
    if (Object.keys(editingPassages).length > 0) {
      saveAllChanges();
    }
    toggleEditMode();
  };

  // Fonction pour exporter au format Excel
  const handleExportExcel = () => {
    alert('Export Excel non implémenté');
  };

  // Fonction pour exporter au format CSV
  const handleExportCsv = () => {
    alert('Export CSV non implémenté');
  };

  // Fonction pour exporter au format PDF
  const handleExportPdf = () => {
    alert('Export PDF non implémenté');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des passages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button className="button" onClick={fetchPassages}>Réessayer</button>
      </div>
    );
  }

  return (
    <div className="passages-page">
      <div className="section-header">
        <h2 className="section-title">Traçabilité</h2>
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
              <button className="button button-warning" onClick={toggleEditMode}>
                <i className="fas fa-times"></i> Annuler
              </button>
              <button className="button button-success" onClick={saveChanges}>
                <i className="fas fa-save"></i> Enregistrer
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
          />
          <select
            className="pole-filter"
            value={selectedPole}
            onChange={(e) => setSelectedPole(e.target.value)}
          >
            <option value="">Filtrer par pôle</option>
            {poles.map((pole) => (
              <option key={pole.id} value={pole.id}>{pole.nom}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Filtres de recherche, positionnés sous le titre */}
      <div className="search-filters-container">
        <div className="search-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
          <div className="search-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label>Date début:</label>
            <div className="custom-datepicker-wrapper">
              <DatePicker
                selected={startDate ? new Date(startDate) : null}
                onChange={(date: Date | null) => setStartDate(date ? date.toISOString().split('T')[0] : '')}
                locale="fr"
                dateFormat="dd/MM/yyyy"
                placeholderText="JJ/MM/AAAA"
                className="custom-datepicker-input"
                popperPlacement="bottom-start"
                popperModifiers={[
                  {
                    name: 'offset',
                    options: {
                      offset: [0, 8],
                    },
                    fn: (state) => state
                  },
                ]}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                isClearable
              />
              <span className="custom-datepicker-icon">📅</span>
            </div>
          </div>
          <div className="search-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label>Date fin:</label>
            <div className="custom-datepicker-wrapper">
              <DatePicker
                selected={endDate ? new Date(endDate) : null}
                onChange={(date: Date | null) => setEndDate(date ? date.toISOString().split('T')[0] : '')}
                locale="fr"
                dateFormat="dd/MM/yyyy"
                placeholderText="JJ/MM/AAAA"
                className="custom-datepicker-input"
                popperPlacement="bottom-start"
                popperModifiers={[
                  {
                    name: 'offset',
                    options: {
                      offset: [0, 8],
                    },
                    fn: (state) => state
                  },
                ]}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                isClearable
              />
              <span className="custom-datepicker-icon">📅</span>
            </div>
          </div>
          <div className="search-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label>Sites:</label>
            <select 
              className="select-input"
              value={siteFilter || ''}
              onChange={(e) => setSiteFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px',
                width: '160px',
                backgroundColor: 'white'
              }}
              title="Filtrer par site"
            >
              <option value="">Tous</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </select>
          </div>
          <div className="search-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label>Tournées:</label>
            <select 
              className="select-input"
              value={tourneeFilter || ''}
              onChange={(e) => setTourneeFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px',
                width: '160px',
                backgroundColor: 'white'
              }}
              title="Filtrer par tournée"
            >
              <option value="">Toutes</option>
              {tournees.map((t) => (
                <option key={t.id} value={t.id}>{t.nom}</option>
              ))}
            </select>
          </div>
          <div className="search-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label>Véhicules:</label>
            <select 
              className="select-input"
              value={vehiculeFilter || ''}
              onChange={(e) => setVehiculeFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px',
                width: '160px',
                backgroundColor: 'white'
              }}
              title="Filtrer par véhicule"
            >
              <option value="">Tous</option>
              {vehicules.map((v) => (
                <option key={v.id} value={v.id}>{v.immatriculation}</option>
              ))}
            </select>
          </div>
          <div className="search-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label>Statut:</label>
            <select 
              className="select-input"
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px',
                width: '160px',
                backgroundColor: 'white'
              }}
              title="Filtrer par statut"
            >
              <option value="">Tous</option>
              <option value="Livré">Livré</option>
              <option value="En cours">En cours</option>
            </select>
          </div>
          <div className="search-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label>ID Colis:</label>
            <input
              type="text"
              className="text-input"
              placeholder="ID Colis"
              value={idColisFilter || ''}
              onChange={(e) => setIdColisFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px',
                width: '160px'
              }}
              title="Filtrer par ID de colis"
            />
          </div>
        </div>
        <div className="search-buttons" style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '15px' }}>
          <button 
            className="search-button" 
            onClick={applyFilters}
            style={{ 
              backgroundColor: '#1976d2', 
              color: 'white', 
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '10px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1565c0'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1976d2'}
          >
            <i className="fas fa-search" style={{ marginRight: '8px' }}></i> Rechercher
          </button>
          <button 
            className="reset-button" 
            onClick={resetFilters}
            style={{ 
              backgroundColor: '#f5f5f5', 
              color: '#333', 
              padding: '10px 20px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
          >
            <i className="fas fa-undo" style={{ marginRight: '8px' }}></i> Réinitialiser
          </button>
        </div>
      </div>
      
      <div className="passages-table-container" style={{ overflowX: 'auto', marginTop: '20px' }}>
        <div className="results-info">
          {appliedFilters ? passagesFiltered.length : passages.length} résultat(s) trouvé(s)
        </div>
        
        <div className="table-container">
          <table className="sites-table">
            <thead>
              <tr>
                {editMode && (
                  <th className="select-all-column">
                    <input 
                      type="checkbox" 
                      checked={selectedPassages.length === filteredPassages.length} 
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPassages(filteredPassages.map(passage => passage.id));
                        } else {
                          setSelectedPassages([]);
                        }
                      }}
                      title="Sélectionner/Désélectionner tous les passages"
                      aria-label="Sélectionner tous les passages"
                    />
                  </th>
                )}
                {columns.filter(col => col.visible).map(column => (
                  <th key={column.id} style={{ width: column.width }}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(appliedFilters ? passagesFiltered : passages).map((passage) => (
                <tr key={passage.id} className={selectedPassages.includes(passage.id) ? 'selected-row' : ''} onClick={() => editMode && togglePassageSelection(passage.id)}>
                  {editMode && (
                    <td className="checkbox-cell">
                      <input 
                        type="checkbox" 
                        checked={selectedPassages.includes(passage.id)} 
                        onChange={() => togglePassageSelection(passage.id)}
                        title={`Sélectionner le passage ${passage.id}`}
                        aria-label={`Sélectionner le passage ${passage.id}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  {columns.filter(col => col.visible).map(column => {
                    switch(column.id) {
                      case 'pole':
                        return (
                          <td key={column.id}>
                            {editMode ? (
                              <PoleSelector
                                value={editingPassages[passage.id]?.pole || passage.pole || ''}
                                onChange={(value) => handleCellChange(passage.id, 'pole', value)}
                                placeholder="Sélectionner un pôle"
                                style={{ width: '100%' }}
                                showSearch
                                allowClear
                              />
                            ) : (
                              getPoleNameById(passage.pole)
                            )}
                          </td>
                        );
                      case 'siteDepart':
                        return (
                          <td key={column.id}>
                            {editMode ? (
                              <select
                                value={editingPassages[passage.id]?.siteDepart || passage.siteDepart}
                                onChange={(e) => handleCellChange(passage.id, 'siteDepart', e.target.value)}
                                className="inline-edit-select"
                                title="Sélectionner un site de départ"
                                aria-label="Site de départ"
                              >
                                <option value="">Sélectionner un site</option>
                                {sites.map(site => (
                                  <option key={site.id} value={site.id}>{site.nom}</option>
                                ))}
                              </select>
                            ) : (
                              getSiteName(passage.siteDepart)
                            )}
                          </td>
                        );
                      case 'date':
                        return (
                          <td key={column.id}>
                            {editMode ? (
                              <input 
                                type="date" 
                                value={formatDateForInput(convertTimestampToDate(editingPassages[passage.id]?.dateHeureDepart || passage.dateHeureDepart))}
                                onChange={(e) => {
                                  const newDate = new Date(e.target.value);
                                  handleCellChange(passage.id, 'dateHeureDepart', Timestamp.fromDate(newDate));
                                }}
                                className="inline-edit-input"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              formatDateFr(convertTimestampToDate(passage.dateHeureDepart))
                            )}
                          </td>
                        );
                      case 'heure':
                        return (
                          <td key={column.id}>
                            {editMode ? (
                              <input 
                                type="time" 
                                value={convertTimestampToTime(editingPassages[passage.id]?.dateHeureDepart || passage.dateHeureDepart)}
                                onChange={(e) => {
                                  // Préserver la date mais changer l'heure
                                  const currentDate = convertTimestampToDate(editingPassages[passage.id]?.dateHeureDepart || passage.dateHeureDepart);
                                  if (currentDate) {
                                    const [hours, minutes] = e.target.value.split(':').map(Number);
                                    currentDate.setHours(hours, minutes);
                                    handleCellChange(passage.id, 'dateHeureDepart', Timestamp.fromDate(currentDate));
                                  }
                                }}
                                className="inline-edit-input"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              passage.dateHeureDepart ? convertTimestampToDate(passage.dateHeureDepart)?.toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : ''
                            )}
                          </td>
                        );
                      case 'statut':
                        return (
                          <td key={column.id}>
                            {editMode ? (
                              <select
                                value={editingPassages[passage.id]?.statut || passage.statut}
                                onChange={(e) => handleCellChange(passage.id, 'statut', e.target.value as 'Livré' | 'En cours')}
                                className="inline-edit-select"
                              >
                                <option value="Livré">Livré</option>
                                <option value="En cours">En cours</option>
                              </select>
                            ) : (
                              <span className={passage.statut === 'Livré' ? 'livré' : 'en-cours'}>
                                {passage.statut}
                              </span>
                            )}
                          </td>
                        );
                      case 'siteFin':
                        return (
                          <td key={column.id}>
                            {editMode ? (
                              <select
                                value={editingPassages[passage.id]?.siteFin || passage.siteFin}
                                onChange={(e) => handleCellChange(passage.id, 'siteFin', e.target.value)}
                                className="inline-edit-select"
                              >
                                <option value="">Sélectionner un site</option>
                                {sites.map(site => (
                                  <option key={site.id} value={site.nom}>
                                    {site.nom}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              getSiteName(passage.siteFin)
                            )}
                          </td>
                        );
                      case 'vehicule':
                        return (
                          <td key={column.id}>
                            {editMode ? (
                              <select
                                value={editingPassages[passage.id]?.vehiculeId || passage.vehiculeId}
                                onChange={(e) => handleCellChange(passage.id, 'vehiculeId', e.target.value)}
                                className="inline-edit-select"
                              >
                                <option value="">Sélectionner un véhicule</option>
                                {vehicules.map(vehicule => (
                                  <option key={vehicule.id} value={vehicule.id}>
                                    {vehicule.immatriculation}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              getVehiculeImmatriculation(passage.vehiculeId)
                            )}
                          </td>
                        );
                      case 'coursier':
                        return (
                          <td key={column.id}>
                            {editMode ? (
                              <input 
                                type="text" 
                                value={editingPassages[passage.id]?.coursierChargement || passage.coursierChargement || ''}
                                onChange={(e) => handleCellChange(passage.id, 'coursierChargement', e.target.value)}
                                className="inline-edit-input"
                              />
                            ) : (
                              passage.coursierChargement || '-'
                            )}
                          </td>
                        );
                      case 'commentaire':
                        return (
                          <td key={column.id}>
                            {editMode ? (
                              <select
                                value={editingPassages[passage.id]?.tourneeId || passage.tourneeId}
                                onChange={(e) => handleCellChange(passage.id, 'tourneeId', e.target.value)}
                                className="inline-edit-select"
                              >
                                <option value="">Sélectionner une tournée</option>
                                {tournees.map(tournee => (
                                  <option key={tournee.id} value={tournee.id}>
                                    {tournee.nom}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              getTourneeName(passage.tourneeId)
                            )}
                          </td>
                        );
                      default:
                        return <td key={column.id}>-</td>;
                    }
                  })}
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
    </div>
  );
};

export default Passages;
