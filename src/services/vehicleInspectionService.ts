import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, Timestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { VehicleInspection, InspectionItem, Photo, InspectionStatus } from '../types/Vehicle';
import { getAuth } from 'firebase/auth';

export interface VehicleInspectionFilters {
  vehicleId?: string;
  inspectedBy?: string;
  status?: InspectionStatus;
  startDate?: string;
  endDate?: string;
  actionRequired?: boolean;
}

class VehicleInspectionService {
  private collectionRef = collection(db, 'inspections');
  private storageBasePath = 'vehicle-inspections';

  // Récupérer toutes les inspections avec filtres optionnels
  async getInspections(filters: VehicleInspectionFilters = {}): Promise<VehicleInspection[]> {
    try {
      let q = query(this.collectionRef, orderBy('date', 'desc'));

      if (filters.vehicleId) {
        q = query(q, where('vehicleId', '==', filters.vehicleId));
      }
      if (filters.inspectedBy) {
        q = query(q, where('inspectedBy', '==', filters.inspectedBy));
      }
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.startDate) {
        q = query(q, where('date', '>=', filters.startDate));
      }
      if (filters.endDate) {
        q = query(q, where('date', '<=', filters.endDate));
      }
      if (filters.actionRequired !== undefined) {
        q = query(q, where('actionRequired', '==', filters.actionRequired));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VehicleInspection[];
    } catch (error) {
      console.error('Erreur lors de la récupération des inspections:', error);
      throw error;
    }
  }

  // Récupérer une inspection par ID
  async getInspectionById(id: string): Promise<VehicleInspection | null> {
    try {
      const inspectionRef = doc(this.collectionRef, id);
      const inspectionDoc = await getDoc(inspectionRef);
      
      if (!inspectionDoc.exists()) {
        return null;
      }
      
      return {
        id: inspectionDoc.id,
        ...inspectionDoc.data()
      } as VehicleInspection;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'inspection:', error);
      throw error;
    }
  }

  // Créer une nouvelle inspection
  async createInspection(inspection: Omit<VehicleInspection, 'id' | 'createdAt' | 'updatedAt'>): Promise<VehicleInspection> {
    try {
      const now = new Date().toISOString();
      
      const docRef = await addDoc(this.collectionRef, {
        ...inspection,
        createdAt: now,
        updatedAt: now
      });

      return {
        id: docRef.id,
        ...inspection,
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      console.error('Erreur lors de la création de l\'inspection:', error);
      throw error;
    }
  }

  // Mettre à jour une inspection existante
  async updateInspection(id: string, inspection: Partial<VehicleInspection>): Promise<void> {
    try {
      const inspectionRef = doc(this.collectionRef, id);
      await updateDoc(inspectionRef, {
        ...inspection,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'inspection:', error);
      throw error;
    }
  }

  // Supprimer une inspection
  async deleteInspection(id: string): Promise<void> {
    try {
      // D'abord, récupérer l'inspection pour obtenir toutes les photos
      const inspection = await this.getInspectionById(id);
      if (inspection) {
        // Supprimer toutes les photos de chaque élément d'inspection
        for (const item of inspection.inspectionItems) {
          for (const photo of item.photos) {
            await this.deletePhoto(photo.url);
          }
        }
      }
      
      // Supprimer le document de l'inspection
      const inspectionRef = doc(this.collectionRef, id);
      await deleteDoc(inspectionRef);
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'inspection:', error);
      throw error;
    }
  }

  // Uploader une photo
  async uploadPhoto(file: File, vehicleId: string, inspectionItemId: string): Promise<Photo> {
    try {
      const timestamp = Date.now();
      const fileName = `${vehicleId}_${inspectionItemId}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const filePath = `${this.storageBasePath}/photos/${fileName}`;
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
              // Créer une version miniature pour améliorer les performances
              const thumbnailUrl = url; // Dans un projet réel, vous créeriez une véritable miniature
              
              const photoData: Photo = {
                id: `photo_${timestamp}`,
                url,
                thumbnailUrl,
                fileName,
                mimeType: file.type,
                size: file.size,
                createdAt: new Date().toISOString(),
                metadata: {
                  width: null, // À remplir avec les dimensions réelles si nécessaire
                  height: null,
                  location: null // À remplir avec les coordonnées GPS si disponibles
                }
              };
              
              resolve(photoData);
            } catch (error) {
              console.error('Erreur lors de la récupération de l\'URL:', error);
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Erreur lors de l\'upload de la photo:', error);
      throw error;
    }
  }

  // Ajouter une photo à un élément d'inspection
  async addPhotoToInspectionItem(
    inspectionId: string, 
    itemId: string, 
    photo: Photo
  ): Promise<void> {
    try {
      const inspection = await this.getInspectionById(inspectionId);
      if (!inspection) {
        throw new Error('Inspection non trouvée');
      }
      
      // Trouver l'élément d'inspection
      const itemIndex = inspection.inspectionItems.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        throw new Error('Élément d\'inspection non trouvé');
      }
      
      // Ajouter la photo à l'élément
      const updatedItems = [...inspection.inspectionItems];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        photos: [...updatedItems[itemIndex].photos, photo]
      };
      
      // Mettre à jour l'inspection
      await this.updateInspection(inspectionId, {
        inspectionItems: updatedItems
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la photo à l\'élément d\'inspection:', error);
      throw error;
    }
  }

  // Supprimer une photo
  async deletePhoto(photoUrl: string): Promise<void> {
    try {
      // Supprimer le fichier du storage
      const fileRef = ref(storage, photoUrl);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('Erreur lors de la suppression de la photo:', error);
      throw error;
    }
  }
  
  // Supprimer une photo d'un élément d'inspection
  async removePhotoFromInspectionItem(
    inspectionId: string,
    itemId: string,
    photoId: string
  ): Promise<void> {
    try {
      const inspection = await this.getInspectionById(inspectionId);
      if (!inspection) {
        throw new Error('Inspection non trouvée');
      }
      
      // Trouver l'élément d'inspection
      const itemIndex = inspection.inspectionItems.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        throw new Error('Élément d\'inspection non trouvé');
      }
      
      // Trouver la photo
      const photoIndex = inspection.inspectionItems[itemIndex].photos.findIndex(photo => photo.id === photoId);
      if (photoIndex === -1) {
        throw new Error('Photo non trouvée');
      }
      
      // Récupérer l'URL de la photo pour la supprimer du storage
      const photoUrl = inspection.inspectionItems[itemIndex].photos[photoIndex].url;
      await this.deletePhoto(photoUrl);
      
      // Supprimer la photo de l'élément
      const updatedPhotos = inspection.inspectionItems[itemIndex].photos.filter(photo => photo.id !== photoId);
      const updatedItems = [...inspection.inspectionItems];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        photos: updatedPhotos
      };
      
      // Mettre à jour l'inspection
      await this.updateInspection(inspectionId, {
        inspectionItems: updatedItems
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de la photo de l\'élément d\'inspection:', error);
      throw error;
    }
  }

  // Méthode de débogage pour tester l'accès aux collections
  async testCollectionAccess() {
    try {
      console.log("===== DÉBUT DES TESTS D'ACCÈS AUX COLLECTIONS =====");
      const auth = getAuth();
      const userId = auth.currentUser?.uid || 'non authentifié';
      const email = auth.currentUser?.email || 'email inconnu';
      
      console.log(`Utilisateur actuel: ID=${userId}, Email=${email}`);
      
      const results = {
        vehicules: { success: false, count: 0, error: '' },
        inspections: { success: false, count: 0, error: '' },
        vehicleInspections: { success: false, count: 0, error: '' },
        roles: { success: false, count: 0, error: '' },
        users: { success: false, count: 0, error: '' }
      };
      
      // Test 1: Accès à la collection vehicules
      try {
        const vehicleQuery = collection(db, 'vehicules');
        const vehicleSnapshot = await getDocs(vehicleQuery);
        results.vehicules.success = true;
        results.vehicules.count = vehicleSnapshot.size;
        console.log(`✅ Accès à 'vehicules' réussi: ${vehicleSnapshot.size} documents`);
      } catch (error) {
        results.vehicules.error = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erreur d'accès à la collection 'vehicules':`, error);
      }
      
      // Test 2: Accès à la collection inspections
      try {
        const inspectionQuery = collection(db, 'inspections');
        const inspectionSnapshot = await getDocs(inspectionQuery);
        results.inspections.success = true;
        results.inspections.count = inspectionSnapshot.size;
        console.log(`✅ Accès à 'inspections' réussi: ${inspectionSnapshot.size} documents`);
      } catch (error) {
        results.inspections.error = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erreur d'accès à la collection 'inspections':`, error);
      }
      
      // Test 3: Accès à la collection vehicleInspections (ancien nom)
      try {
        const oldInspectionQuery = collection(db, 'vehicleInspections');
        const oldInspectionSnapshot = await getDocs(oldInspectionQuery);
        results.vehicleInspections.success = true;
        results.vehicleInspections.count = oldInspectionSnapshot.size;
        console.log(`✅ Accès à 'vehicleInspections' réussi: ${oldInspectionSnapshot.size} documents`);
      } catch (error) {
        results.vehicleInspections.error = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erreur d'accès à la collection 'vehicleInspections':`, error);
      }
      
      // Test 4: Accès à la collection roles
      try {
        const rolesQuery = collection(db, 'roles');
        const rolesSnapshot = await getDocs(rolesQuery);
        results.roles.success = true;
        results.roles.count = rolesSnapshot.size;
        console.log(`✅ Accès à 'roles' réussi: ${rolesSnapshot.size} documents`);
      } catch (error) {
        results.roles.error = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erreur d'accès à la collection 'roles':`, error);
      }
      
      // Test 5: Accès à la collection users
      try {
        const usersQuery = collection(db, 'users');
        const usersSnapshot = await getDocs(usersQuery);
        results.users.success = true;
        results.users.count = usersSnapshot.size;
        console.log(`✅ Accès à 'users' réussi: ${usersSnapshot.size} documents`);
      } catch (error) {
        results.users.error = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erreur d'accès à la collection 'users':`, error);
      }
      
      console.log("===== RÉSUMÉ DES TESTS D'ACCÈS =====");
      console.log(JSON.stringify(results, null, 2));
      console.log("===== FIN DES TESTS D'ACCÈS =====");
      
      // Construire un message de résumé
      const successCount = Object.values(results).filter(r => r.success).length;
      const totalCount = Object.keys(results).length;
      const summaryMsg = `Tests d'accès: ${successCount}/${totalCount} collections accessibles
- vehicules: ${results.vehicules.success ? '✅' : '❌'}
- inspections: ${results.inspections.success ? '✅' : '❌'}
- vehicleInspections: ${results.vehicleInspections.success ? '✅' : '❌'}
- roles: ${results.roles.success ? '✅' : '❌'}
- users: ${results.users.success ? '✅' : '❌'}`;
      
      return {
        success: successCount > 0,
        message: summaryMsg,
        details: results
      };
    } catch (error) {
      console.error("Erreur lors des tests d'accès:", error);
      return {
        success: false,
        message: `Erreur lors des tests: ${error instanceof Error ? error.message : String(error)}`,
        details: {}
      };
    }
  }

  // Méthode pour créer une inspection de test
  async createTestInspection(vehicleId: string): Promise<VehicleInspection> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      const now = Timestamp.now();
      const testInspection: Omit<VehicleInspection, 'id'> = {
        vehicleId,
        date: now.toDate().toISOString(),
        inspectorName: user.displayName || user.email || 'Inspecteur Test',
        odometer: 50000,
        status: 'passed',
        generalComments: 'Inspection de test',
        inspectionItems: [
          {
            id: 'item1',
            category: 'Sécurité',
            name: 'Freins',
            status: 'ok',
            comments: 'RAS',
            photos: []
          },
          {
            id: 'item2',
            category: 'Extérieur',
            name: 'Carrosserie',
            status: 'ok',
            comments: 'RAS',
            photos: []
          }
        ],
        actionRequired: false,
        actionDescription: '',
        createdAt: now.toDate().toISOString(),
        updatedAt: now.toDate().toISOString()
      };

      const docRef = await addDoc(this.collectionRef, testInspection);
      return {
        id: docRef.id,
        ...testInspection
      };
    } catch (error) {
      console.error('Erreur lors de la création de l\'inspection de test:', error);
      throw error;
    }
  }
}

const vehicleInspectionService = new VehicleInspectionService();
export default vehicleInspectionService;
export { VehicleInspectionService }; 
