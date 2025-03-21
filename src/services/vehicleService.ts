import { Vehicle, VehicleFilters, VehicleDocument, InsuranceInfo, MaintenanceRecord, TechnicalSpecifications } from '../types/Vehicle';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, orderBy, limit, startAfter, DocumentData } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db } from '../config/firebase';
import { getStorage } from 'firebase/storage';

class VehicleService {
  private collection = collection(db, 'vehicules');
  private documentsCollection = collection(db, 'documents');
  private maintenanceCollection = collection(db, 'maintenance');
  private storage = getStorage();
  private storageBasePath = 'vehicles';
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
      documents: [],
      inspections: [],
      maintenanceHistory: [],
      insuranceInfo: {
        provider: 'AXA',
        policyNumber: 'AX123456789',
        validFrom: '2023-01-01',
        validUntil: '2024-01-01',
        coverageType: 'comprehensive',
        monthlyPremium: 120,
        currency: 'EUR',
        documents: []
      },
      technicalSpecifications: {
        vin: 'VF1FW1AB123456789',
        year: 2020,
        engine: {
          type: 'Diesel 1.5 dCi',
          power: 85,
          cylinderCapacity: 1461
        },
        transmission: 'manual',
        weight: 1485,
        dimensions: {
          length: 4490,
          width: 1830,
          height: 1835
        },
        maxPayload: 650,
        fuelConsumption: {
          urban: 5.5,
          extraUrban: 4.6,
          combined: 5.0
        },
        emissions: {
          co2: 131,
          emissionStandard: 'Euro 6d'
        },
        tires: {
          frontSize: '195/65 R15',
          rearSize: '195/65 R15',
          recommendedPressure: {
            front: 2.5,
            rear: 2.5
          }
        }
      },
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
      documents: [],
      inspections: [],
      maintenanceHistory: [],
      insuranceInfo: {
        provider: 'MMA',
        policyNumber: 'MM789654321',
        validFrom: '2023-01-01',
        validUntil: '2024-01-01',
        coverageType: 'comprehensive',
        monthlyPremium: 110,
        currency: 'EUR',
        documents: []
      },
      technicalSpecifications: {
        vin: 'VF7GBHFXBEUR567890',
        year: 2021,
        engine: {
          type: 'Diesel 1.5 BlueHDi',
          power: 100,
          cylinderCapacity: 1499
        },
        transmission: 'manual',
        weight: 1532,
        dimensions: {
          length: 4650,
          width: 1850,
          height: 1860
        },
        maxPayload: 700,
        fuelConsumption: {
          urban: 5.0,
          extraUrban: 4.2,
          combined: 4.6
        },
        emissions: {
          co2: 120,
          emissionStandard: 'Euro 6d'
        },
        tires: {
          frontSize: '205/60 R16',
          rearSize: '205/60 R16',
          recommendedPressure: {
            front: 2.5,
            rear: 2.5
          }
        }
      },
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
      documents: [],
      inspections: [],
      maintenanceHistory: [],
      insuranceInfo: {
        provider: 'Generali',
        policyNumber: 'GE567891234',
        validFrom: '2023-01-01',
        validUntil: '2024-01-01',
        coverageType: 'comprehensive',
        monthlyPremium: 90,
        currency: 'EUR',
        documents: []
      },
      technicalSpecifications: {
        vin: 'VF1RJA00067123456',
        year: 2022,
        engine: {
          type: 'Petrol 1.0 TCe',
          power: 90,
          cylinderCapacity: 999
        },
        transmission: 'manual',
        weight: 1178,
        dimensions: {
          length: 4050,
          width: 1798,
          height: 1440
        },
        fuelConsumption: {
          urban: 6.2,
          extraUrban: 4.5,
          combined: 5.1
        },
        emissions: {
          co2: 118,
          emissionStandard: 'Euro 6d'
        },
        tires: {
          frontSize: '195/55 R16',
          rearSize: '195/55 R16',
          recommendedPressure: {
            front: 2.2,
            rear: 2.0
          }
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Initialiser les véhicules par défaut
  async initializeDefaultVehicles(): Promise<void> {
    try {
      const snapshot = await getDocs(this.collection);
      if (snapshot.empty) {
        console.log('Initialisation des véhicules par défaut...');
        for (const vehicle of this.defaultVehicles) {
          await this.createVehicle(vehicle);
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

  // Récupérer tous les véhicules avec filtres optionnels
  async getVehicles(filters: VehicleFilters = {}): Promise<Vehicle[]> {
    try {
      let q = query(this.collection);

      // Appliquer les filtres
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.assignedDriver) {
        q = query(q, where('assignedDriver', '==', filters.assignedDriver));
      }

      // Recherche par texte
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const snapshot = await getDocs(this.collection);
        return snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Vehicle))
          .filter(vehicle => 
            vehicle.brand.toLowerCase().includes(searchTerm) ||
            vehicle.model.toLowerCase().includes(searchTerm) ||
            vehicle.registrationNumber.toLowerCase().includes(searchTerm)
          );
      }

      const snapshot = await getDocs(q);
      const vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));

      // Appliquer les filtres supplémentaires en mémoire
      return vehicles.filter(vehicle => {
        if (filters.minMileage && vehicle.mileage < filters.minMileage) return false;
        if (filters.maxMileage && vehicle.mileage > filters.maxMileage) return false;
        if (filters.needsMaintenance) {
          const nextMaintenance = new Date(vehicle.nextMaintenanceDate);
          const today = new Date();
          return nextMaintenance <= today;
        }
        if (filters.documentExpiresWithin && filters.documentExpiresWithin > 0) {
          const today = new Date();
          const futureDate = new Date(today);
          futureDate.setDate(today.getDate() + filters.documentExpiresWithin);
          
          return vehicle.documents.some(doc => {
            if (doc.expiryDate) {
              const expiryDate = new Date(doc.expiryDate);
              return expiryDate <= futureDate && expiryDate >= today;
            }
            return false;
          });
        }
        if (filters.lastInspectionStatus && vehicle.inspections.length > 0) {
          // Trouver la dernière inspection
          const lastInspection = vehicle.inspections
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          return lastInspection.status === filters.lastInspectionStatus;
        }
        return true;
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des véhicules:', error);
      throw error;
    }
  }

  // Récupérer un véhicule par son ID
  async getVehicleById(id: string): Promise<Vehicle | null> {
    try {
      const docRef = doc(this.collection, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Vehicle;
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération du véhicule:', error);
      throw error;
    }
  }

  // Créer un nouveau véhicule
  async createVehicle(vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    try {
      const docRef = await addDoc(this.collection, {
        ...vehicle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return { id: docRef.id, ...vehicle };
    } catch (error) {
      console.error('Erreur lors de la création du véhicule:', error);
      throw error;
    }
  }

  // Mettre à jour un véhicule existant
  async updateVehicle(id: string, data: Partial<Vehicle>): Promise<void> {
    try {
      const docRef = doc(this.collection, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du véhicule:', error);
      throw error;
    }
  }

  // Supprimer un véhicule
  async deleteVehicle(id: string): Promise<void> {
    try {
      const docRef = doc(this.collection, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Erreur lors de la suppression du véhicule:', error);
      throw error;
    }
  }

  // ===== Gestion des documents =====
  
  // Ajouter un document à un véhicule
  async addDocumentToVehicle(vehicleId: string, document: Omit<VehicleDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<VehicleDocument> {
    try {
      const docRef = await addDoc(this.documentsCollection, {
        ...document,
        vehicleId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return { id: docRef.id, ...document };
    } catch (error) {
      console.error('Erreur lors de l\'ajout du document au véhicule:', error);
      throw error;
    }
  }
  
  // Mettre à jour un document
  async updateDocument(documentId: string, data: Partial<VehicleDocument>): Promise<void> {
    try {
      const docRef = doc(this.documentsCollection, documentId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du document:', error);
      throw error;
    }
  }
  
  // Supprimer un document
  async deleteDocument(documentId: string): Promise<void> {
    try {
      const docRef = doc(this.documentsCollection, documentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Erreur lors de la suppression du document:', error);
      throw error;
    }
  }
  
  // Uploader un document
  async uploadDocument(vehicleId: string, file: File): Promise<{ url: string; thumbnailUrl: string }> {
    try {
      const timestamp = Date.now();
      const fileName = `${vehicleId}/${timestamp}_${file.name}`;
      const storageRef = ref(this.storage, `${this.storageBasePath}/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      // Pour les images, créer une miniature
      let thumbnailUrl = url;
      if (file.type.startsWith('image/')) {
        const thumbnailRef = ref(this.storage, `${this.storageBasePath}/${vehicleId}/${timestamp}_thumb_${file.name}`);
        // TODO: Implémenter la création de miniature
        thumbnailUrl = url;
      }
      
      return { url, thumbnailUrl };
    } catch (error) {
      console.error('Erreur lors de l\'upload du document:', error);
      throw error;
    }
  }

  // ===== Gestion de la maintenance =====
  
  // Ajouter un enregistrement de maintenance
  async addMaintenanceRecord(vehicleId: string, record: Omit<MaintenanceRecord, 'id'>): Promise<MaintenanceRecord> {
    try {
      const docRef = await addDoc(this.maintenanceCollection, {
        ...record,
        vehicleId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return { id: docRef.id, ...record };
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'enregistrement de maintenance:', error);
      throw error;
    }
  }
  
  // Mettre à jour un enregistrement de maintenance
  async updateMaintenanceRecord(recordId: string, data: Partial<MaintenanceRecord>): Promise<void> {
    try {
      const docRef = doc(this.maintenanceCollection, recordId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'enregistrement de maintenance:', error);
      throw error;
    }
  }
  
  // Supprimer un enregistrement de maintenance
  async deleteMaintenanceRecord(recordId: string): Promise<void> {
    try {
      const docRef = doc(this.maintenanceCollection, recordId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'enregistrement de maintenance:', error);
      throw error;
    }
  }

  // ===== Gestion des informations d'assurance =====
  
  // Mettre à jour les informations d'assurance
  async updateInsuranceInfo(vehicleId: string, insuranceInfo: InsuranceInfo): Promise<void> {
    try {
      const docRef = doc(this.collection, vehicleId);
      await updateDoc(docRef, {
        insuranceInfo,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des informations d\'assurance:', error);
      throw error;
    }
  }

  async updateTechnicalSpecifications(vehicleId: string, specifications: TechnicalSpecifications): Promise<void> {
    try {
      const docRef = doc(this.collection, vehicleId);
      await updateDoc(docRef, {
        technicalSpecifications: specifications,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des spécifications techniques:', error);
      throw error;
    }
  }
}

// Export the service instance
const vehicleService = new VehicleService();
export default vehicleService;

// Export the class as well
export { VehicleService }; 
