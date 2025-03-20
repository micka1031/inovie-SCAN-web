import { Vehicle, VehicleFilters, VehicleDocument, InsuranceInfo, MaintenanceRecord, TechnicalSpecifications } from '../types/Vehicle';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

class VehicleService {
  private collection = 'vehicles';
  private documentsCollection = 'vehicleDocuments';
  private maintenanceCollection = 'maintenanceRecords';
  private storageBasePath = 'vehicle-documents';
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
      if (filters.assignedDriver) {
        q = query(q, where('assignedDriver', '==', filters.assignedDriver));
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
      // Attendre que Firestore soit initialisé
      await this.waitForFirestore();

      const vehicleRef = doc(db, this.collection, id);
      const vehicleDoc = await getDoc(vehicleRef);

      if (!vehicleDoc.exists()) {
        return null;
      }

      return {
        id: vehicleDoc.id,
        ...vehicleDoc.data()
      } as Vehicle;
    } catch (error) {
      console.error('Erreur lors de la récupération du véhicule:', error);
      throw error;
    }
  }

  // Créer un nouveau véhicule
  async createVehicle(vehicleData: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    try {
      // Attendre que Firestore soit initialisé
      await this.waitForFirestore();

      const vehiclesRef = collection(db, this.collection);
      const now = new Date().toISOString();
      
      // S'assurer que les tableaux sont initialisés
      const dataToSave = {
        ...vehicleData,
        documents: vehicleData.documents || [],
        inspections: vehicleData.inspections || [],
        maintenanceHistory: vehicleData.maintenanceHistory || [],
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(vehiclesRef, dataToSave);
      
      return {
        id: docRef.id,
        ...dataToSave
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

      // Récupérer d'abord le véhicule pour gérer les documents et autres ressources associées
      const vehicle = await this.getVehicleById(id);
      if (vehicle) {
        // Supprimer tous les documents associés
        for (const doc of vehicle.documents) {
          await this.deleteDocument(doc.id);
        }
        
        // Supprimer le véhicule lui-même
        const vehicleRef = doc(db, this.collection, id);
        await deleteDoc(vehicleRef);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du véhicule:', error);
      throw error;
    }
  }

  // ===== Gestion des documents =====
  
  // Ajouter un document à un véhicule
  async addDocumentToVehicle(vehicleId: string, document: Omit<VehicleDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<VehicleDocument> {
    try {
      const vehicle = await this.getVehicleById(vehicleId);
      if (!vehicle) {
        throw new Error('Véhicule non trouvé');
      }
      
      const now = new Date().toISOString();
      const newDocument: VehicleDocument = {
        id: `doc_${Date.now()}`,
        ...document,
        createdAt: now,
        updatedAt: now
      };
      
      // Ajouter le document au véhicule
      const updatedDocuments = [...vehicle.documents, newDocument];
      await this.updateVehicle(vehicleId, { documents: updatedDocuments });
      
      return newDocument;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du document au véhicule:', error);
      throw error;
    }
  }
  
  // Mettre à jour un document
  async updateDocument(vehicleId: string, documentId: string, updates: Partial<VehicleDocument>): Promise<void> {
    try {
      const vehicle = await this.getVehicleById(vehicleId);
      if (!vehicle) {
        throw new Error('Véhicule non trouvé');
      }
      
      const documentIndex = vehicle.documents.findIndex(doc => doc.id === documentId);
      if (documentIndex === -1) {
        throw new Error('Document non trouvé');
      }
      
      // Mettre à jour le document
      const updatedDocuments = [...vehicle.documents];
      updatedDocuments[documentIndex] = {
        ...updatedDocuments[documentIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await this.updateVehicle(vehicleId, { documents: updatedDocuments });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du document:', error);
      throw error;
    }
  }
  
  // Supprimer un document
  async deleteDocument(documentId: string): Promise<void> {
    try {
      // Récupérer tous les véhicules (pas optimal mais nécessaire puisque nous ne savons pas auquel appartient le document)
      const vehicles = await this.getVehicles();
      
      for (const vehicle of vehicles) {
        const documentIndex = vehicle.documents.findIndex(doc => doc.id === documentId);
        if (documentIndex !== -1) {
          // Document trouvé, récupérer l'URL du fichier
          const fileUrl = vehicle.documents[documentIndex].fileUrl;
          
          // Supprimer le fichier du storage
          try {
            const fileRef = ref(storage, fileUrl);
            await deleteObject(fileRef);
          } catch (storageError) {
            console.warn('Erreur lors de la suppression du fichier du storage:', storageError);
            // Continuer même si le fichier ne peut pas être supprimé du storage
          }
          
          // Mettre à jour la liste des documents du véhicule
          const updatedDocuments = vehicle.documents.filter(doc => doc.id !== documentId);
          await this.updateVehicle(vehicle.id, { documents: updatedDocuments });
          
          break; // Le document a été trouvé et supprimé, sortir de la boucle
        }
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du document:', error);
      throw error;
    }
  }
  
  // Uploader un document
  async uploadDocument(file: File, vehicleId: string, docType: VehicleDocument['type']): Promise<string> {
    try {
      const timestamp = Date.now();
      const fileName = `${vehicleId}_${docType}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const filePath = `${this.storageBasePath}/${fileName}`;
      const storageRef = ref(storage, filePath);

      // Upload le fichier avec progression
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload progress:', progress);
          },
          (error) => {
            console.error('Erreur lors de l\'upload:', error);
            reject(error);
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (error) {
              console.error('Erreur lors de la récupération de l\'URL:', error);
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Erreur lors de l\'upload du document:', error);
      throw error;
    }
  }

  // ===== Gestion de la maintenance =====
  
  // Ajouter un enregistrement de maintenance
  async addMaintenanceRecord(vehicleId: string, record: Omit<MaintenanceRecord, 'id' | 'vehicleId' | 'createdAt' | 'updatedAt'>): Promise<MaintenanceRecord> {
    try {
      const vehicle = await this.getVehicleById(vehicleId);
      if (!vehicle) {
        throw new Error('Véhicule non trouvé');
      }
      
      const now = new Date().toISOString();
      const newRecord: MaintenanceRecord = {
        id: `maint_${Date.now()}`,
        vehicleId,
        ...record,
        createdAt: now,
        updatedAt: now
      };
      
      // Ajouter l'enregistrement à l'historique de maintenance du véhicule
      const updatedHistory = [...vehicle.maintenanceHistory, newRecord];
      
      // Mettre à jour la date de dernière maintenance et le kilométrage si nécessaire
      const updates: Partial<Vehicle> = {
        maintenanceHistory: updatedHistory
      };
      
      // Si c'est la maintenance la plus récente, mettre à jour lastMaintenanceDate
      const recordDate = new Date(record.date);
      const lastMaintenanceDate = new Date(vehicle.lastMaintenanceDate);
      if (recordDate > lastMaintenanceDate) {
        updates.lastMaintenanceDate = record.date;
      }
      
      await this.updateVehicle(vehicleId, updates);
      
      return newRecord;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'enregistrement de maintenance:', error);
      throw error;
    }
  }
  
  // Mettre à jour un enregistrement de maintenance
  async updateMaintenanceRecord(vehicleId: string, recordId: string, updates: Partial<MaintenanceRecord>): Promise<void> {
    try {
      const vehicle = await this.getVehicleById(vehicleId);
      if (!vehicle) {
        throw new Error('Véhicule non trouvé');
      }
      
      const recordIndex = vehicle.maintenanceHistory.findIndex(rec => rec.id === recordId);
      if (recordIndex === -1) {
        throw new Error('Enregistrement de maintenance non trouvé');
      }
      
      // Mettre à jour l'enregistrement
      const updatedRecords = [...vehicle.maintenanceHistory];
      updatedRecords[recordIndex] = {
        ...updatedRecords[recordIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await this.updateVehicle(vehicleId, { maintenanceHistory: updatedRecords });
      
      // Vérifier s'il faut mettre à jour la date de dernière maintenance
      if (updates.date) {
        // Trouver la maintenance la plus récente
        const sortedRecords = [...updatedRecords].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        await this.updateVehicle(vehicleId, { lastMaintenanceDate: sortedRecords[0].date });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'enregistrement de maintenance:', error);
      throw error;
    }
  }
  
  // Supprimer un enregistrement de maintenance
  async deleteMaintenanceRecord(vehicleId: string, recordId: string): Promise<void> {
    try {
      const vehicle = await this.getVehicleById(vehicleId);
      if (!vehicle) {
        throw new Error('Véhicule non trouvé');
      }
      
      // Filtrer l'enregistrement à supprimer
      const updatedRecords = vehicle.maintenanceHistory.filter(rec => rec.id !== recordId);
      
      await this.updateVehicle(vehicleId, { maintenanceHistory: updatedRecords });
      
      // Mettre à jour la date de dernière maintenance si nécessaire
      if (updatedRecords.length > 0) {
        const sortedRecords = [...updatedRecords].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        await this.updateVehicle(vehicleId, { lastMaintenanceDate: sortedRecords[0].date });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'enregistrement de maintenance:', error);
      throw error;
    }
  }

  // ===== Gestion des informations d'assurance =====
  
  // Mettre à jour les informations d'assurance
  async updateInsuranceInfo(vehicleId: string, insuranceInfo: InsuranceInfo): Promise<void> {
    try {
      await this.updateVehicle(vehicleId, { insuranceInfo });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des informations d\'assurance:', error);
      throw error;
    }
  }
}

export const vehicleService = new VehicleService(); 