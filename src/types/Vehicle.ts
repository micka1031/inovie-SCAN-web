export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  registrationNumber: string;
  type: 'car' | 'truck' | 'van' | 'motorcycle';
  status: 'active' | 'maintenance' | 'inactive' | 'out_of_service';
  purchaseDate: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  mileage: number;
  fuelType: 'diesel' | 'petrol' | 'electric' | 'hybrid' | 'hydrogen';
  capacity?: number; // Pour les camions/vans
  notes?: string;
  assignedDriver?: string; // ID du coursier assigné au véhicule
  documents: VehicleDocument[];
  inspections: VehicleInspection[];
  maintenanceHistory: MaintenanceRecord[];
  insuranceInfo: InsuranceInfo;
  technicalSpecifications: TechnicalSpecifications;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleFilters {
  search?: string;
  type?: Vehicle['type'];
  status?: Vehicle['status'];
  brand?: string;
  minMileage?: number;
  maxMileage?: number;
  needsMaintenance?: boolean;
  assignedDriver?: string;
  documentExpiresWithin?: number; // en jours
  lastInspectionStatus?: InspectionStatus;
}

// Interface pour les documents liés au véhicule
export interface VehicleDocument {
  id: string;
  type: 'insurance' | 'registration' | 'technical_control' | 'maintenance_report' | 'purchase_invoice' | 'other';
  title: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  issueDate: string;
  expiryDate?: string;
  status: 'valid' | 'expired' | 'about_to_expire';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// État des éléments inspectés
export type InspectionItemStatus = 'ok' | 'attention' | 'critical' | 'not_applicable';

// Statut global de l'inspection
export type InspectionStatus = 'passed' | 'passed_with_warnings' | 'failed' | 'incomplete';

// Élément spécifique vérifié pendant une inspection
export interface InspectionItem {
  id: string;
  category: 'exterior' | 'interior' | 'mechanical' | 'electrical' | 'safety' | 'fluids' | 'tires' | 'other';
  name: string;
  status: InspectionItemStatus;
  comments?: string;
  photos: Photo[];
}

// Interface pour les photos
export interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  metadata?: {
    width?: number;
    height?: number;
    location?: {
      latitude: number;
      longitude: number;
    }
  };
}

// Interface pour les vérifications effectuées par les coursiers
export interface VehicleInspection {
  id: string;
  vehicleId: string;
  inspectedBy: string; // ID du coursier
  inspectorName: string; // Nom du coursier
  date: string;
  odometer: number;
  status: InspectionStatus;
  inspectionItems: InspectionItem[];
  generalComments?: string;
  actionRequired: boolean;
  actionDescription?: string;
  actionDueDate?: string;
  actionCompletedBy?: string;
  actionCompletedDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Interface pour l'historique de maintenance
export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: 'scheduled' | 'repair' | 'emergency' | 'recall';
  date: string;
  odometer: number;
  description: string;
  performedBy: string; // Garage ou mécanicien
  cost: number;
  currency: string;
  parts?: MaintenancePart[];
  documents: VehicleDocument[];
  createdAt: string;
  updatedAt: string;
}

// Interface pour les pièces utilisées lors d'une maintenance
export interface MaintenancePart {
  id: string;
  name: string;
  partNumber?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  warranty?: {
    duration: number; // en mois
    expiryDate: string;
  };
}

// Interface pour les informations d'assurance
export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  validFrom: string;
  validUntil: string;
  coverageType: 'basic' | 'intermediate' | 'comprehensive';
  monthlyPremium: number;
  currency: string;
  documents: VehicleDocument[];
  contactInfo?: {
    name: string;
    phone: string;
    email: string;
  };
}

// Interface pour les spécifications techniques
export interface TechnicalSpecifications {
  vin: string; // Vehicle Identification Number
  year: number;
  engine: {
    type: string;
    power: number; // en chevaux ou kW
    cylinderCapacity?: number; // en cc pour les moteurs à combustion
  };
  transmission: 'manual' | 'automatic' | 'semi-automatic';
  weight: number; // en kg
  dimensions: {
    length: number; // en mm
    width: number; // en mm
    height: number; // en mm
  };
  maxPayload?: number; // pour les vans/camions
  maxTowingCapacity?: number;
  fuelConsumption?: {
    urban: number; // L/100km ou kWh/100km
    extraUrban: number;
    combined: number;
  };
  emissions?: {
    co2: number; // g/km
    emissionStandard: string; // ex: Euro 6, Euro 5
  };
  tires: {
    frontSize: string;
    rearSize: string;
    recommendedPressure: {
      front: number; // en bar ou psi
      rear: number;
    };
  };
} 