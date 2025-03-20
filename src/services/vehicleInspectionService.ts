import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, Timestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { VehicleInspection, InspectionItem, Photo, InspectionStatus } from '../types/Vehicle';

export interface VehicleInspectionFilters {
  vehicleId?: string;
  inspectedBy?: string;
  status?: InspectionStatus;
  startDate?: string;
  endDate?: string;
  actionRequired?: boolean;
}

class VehicleInspectionService {
  private collection = 'vehicleInspections';
  private storageBasePath = 'vehicle-inspections';

  // Récupérer toutes les inspections avec filtres optionnels
  async getInspections(filters: VehicleInspectionFilters = {}): Promise<VehicleInspection[]> {
    try {
      const inspectionsRef = collection(db, this.collection);
      let q = query(inspectionsRef, orderBy('date', 'desc'));

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
      const inspectionRef = doc(db, this.collection, id);
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
      const inspectionsRef = collection(db, this.collection);
      const now = new Date().toISOString();
      
      const docRef = await addDoc(inspectionsRef, {
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
      const inspectionRef = doc(db, this.collection, id);
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
      const inspectionRef = doc(db, this.collection, id);
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
}

export const vehicleInspectionService = new VehicleInspectionService(); 