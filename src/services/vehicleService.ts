import { Vehicle, VehicleFilters } from '../types/Vehicle';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

class VehicleService {
  private collection = 'vehicles';
  private initialized = false;

  // Données par défaut pour les véhicules
  private defaultVehicles: Omit<Vehicle, 'id'>[] = [
    {
      brand: 'Renault',
      model: 'Kangoo',
      registrationNumber: 'GE-695-RT',
      type: 'van',
      status: 'active',
      purchaseDate: '2020-01-01',
      lastMaintenanceDate: '2023-01-15',
      nextMaintenanceDate: '2023-07-15',
      mileage: 45000,
      fuelType: 'diesel',
      capacity: 800,
      notes: 'Véhicule utilitaire principal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      brand: 'Citroën',
      model: 'Berlingo',
      registrationNumber: 'GI-456-AD',
      type: 'van',
      status: 'active',
      purchaseDate: '2021-01-01',
      lastMaintenanceDate: '2023-02-10',
      nextMaintenanceDate: '2023-08-10',
      mileage: 32500,
      fuelType: 'diesel',
      capacity: 800,
      notes: 'Véhicule utilitaire secondaire',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      brand: 'Renault',
      model: 'Clio',
      registrationNumber: 'GL-789-BA',
      type: 'car',
      status: 'active',
      purchaseDate: '2022-01-01',
      lastMaintenanceDate: '2023-02-20',
      nextMaintenanceDate: '2023-08-20',
      mileage: 15800,
      fuelType: 'petrol',
      notes: 'Véhicule de service',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Initialiser les véhicules par défaut
  async initializeDefaultVehicles(): Promise<void> {
    try {
      // Attendre que Firestore soit initialisé
      await this.waitForFirestore();

      const vehiclesRef = collection(db, this.collection);
      const snapshot = await getDocs(vehiclesRef);

      if (snapshot.empty) {
        console.log('Initialisation des véhicules par défaut...');
        for (const vehicle of this.defaultVehicles) {
          await addDoc(vehiclesRef, vehicle);
        }
        console.log('Véhicules par défaut initialisés avec succès');
      } else {
        console.log('La collection de véhicules n\'est pas vide, pas d\'initialisation nécessaire');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des véhicules par défaut:', error);
      throw error;
    }
  }

  // Attendre que Firestore soit initialisé
  private async waitForFirestore(): Promise<void> {
    if (this.initialized) return;

    try {
      // Tenter une opération simple pour vérifier que Firestore est prêt
      const vehiclesRef = collection(db, this.collection);
      await getDocs(query(vehiclesRef, where('type', '==', 'test')));
      this.initialized = true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Firestore:', error);
      throw error;
    }
  }

  // Récupérer tous les véhicules avec filtres optionnels
  async getVehicles(filters: VehicleFilters = {}): Promise<Vehicle[]> {
    try {
      // Attendre que Firestore soit initialisé
      await this.waitForFirestore();

      const vehiclesRef = collection(db, this.collection);
      let q = query(vehiclesRef);

      // Appliquer les filtres si présents
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.brand) {
        q = query(q, where('brand', '==', filters.brand));
      }

      const snapshot = await getDocs(q);
      const vehicles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Vehicle[];

      // Appliquer les filtres supplémentaires en mémoire
      return vehicles.filter(vehicle => {
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          return (
            vehicle.brand.toLowerCase().includes(searchLower) ||
            vehicle.model.toLowerCase().includes(searchLower) ||
            vehicle.registrationNumber.toLowerCase().includes(searchLower)
          );
        }
        if (filters.minMileage && vehicle.mileage < filters.minMileage) return false;
        if (filters.maxMileage && vehicle.mileage > filters.maxMileage) return false;
        if (filters.needsMaintenance) {
          const nextMaintenance = new Date(vehicle.nextMaintenanceDate);
          const today = new Date();
          return nextMaintenance <= today;
        }
        return true;
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des véhicules:', error);
      throw error;
    }
  }

  // Créer un nouveau véhicule
  async createVehicle(vehicleData: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    try {
      // Attendre que Firestore soit initialisé
      await this.waitForFirestore();

      const vehiclesRef = collection(db, this.collection);
      const docRef = await addDoc(vehiclesRef, {
        ...vehicleData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return {
        id: docRef.id,
        ...vehicleData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur lors de la création du véhicule:', error);
      throw error;
    }
  }

  // Mettre à jour un véhicule existant
  async updateVehicle(id: string, vehicleData: Partial<Vehicle>): Promise<void> {
    try {
      // Attendre que Firestore soit initialisé
      await this.waitForFirestore();

      const vehicleRef = doc(db, this.collection, id);
      await updateDoc(vehicleRef, {
        ...vehicleData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du véhicule:', error);
      throw error;
    }
  }

  // Supprimer un véhicule
  async deleteVehicle(id: string): Promise<void> {
    try {
      // Attendre que Firestore soit initialisé
      await this.waitForFirestore();

      const vehicleRef = doc(db, this.collection, id);
      await deleteDoc(vehicleRef);
    } catch (error) {
      console.error('Erreur lors de la suppression du véhicule:', error);
      throw error;
    }
  }
}

export const vehicleService = new VehicleService(); 