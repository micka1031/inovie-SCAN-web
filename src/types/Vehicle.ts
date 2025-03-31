export type VehicleType = 'car' | 'van' | 'truck' | 'motorcycle' | 'bicycle';
export type VehicleStatus = 'active' | 'maintenance' | 'inactive' | 'sold';
export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'lpg';
export type DocumentStatus = 'valid' | 'expired' | 'pending';
export type InspectionStatus = 'passed' | 'passed_with_warnings' | 'failed' | 'incomplete' | 'pending';
export type InspectionItemStatus = 'ok' | 'attention' | 'critical' | 'not_applicable';
export type MaintenanceType = 'routine' | 'repair' | 'inspection' | 'other';

export interface Document {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
  thumbnailUrl?: string;
  issueDate: string;
  expiryDate: string;
  status: DocumentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleDocument extends Document {
  vehicleId: string;
  fileType?: string;
  fileSize?: number;
  fileName?: string;
}

export interface Photo {
  id: string;
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  description?: string;
  takenAt?: string;
  createdAt: string;
  metadata?: {
    width: number | null;
    height: number | null;
    location: string | null;
  };
}

export interface InspectionItem {
  id: string;
  name: string;
  category: string;
  status: InspectionItemStatus;
  notes?: string;
  photos: Photo[];
  comments?: string;
}

export interface Inspection {
  id: string;
  date: string;
  type: string;
  status: InspectionStatus;
  items: InspectionItem[];
  photos: Photo[];
  notes?: string;
  nextDueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  type: MaintenanceType;
  description: string;
  mileage: string;
  cost: number;
  provider?: string;
  nextDueDate?: string;
  notes?: string;
  photos?: Photo[];
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  startDate: string;
  endDate: string;
  coverage: string[];
  deductible: number;
  premium: number;
  notes?: string;
}

export interface EngineSpecs {
  type: string;
  displacement: string;
  power: string;
  torque: string;
  cylinders: number;
  fuelSystem: string;
  transmission: string;
}

export interface Dimensions {
  length: string;
  width: string;
  height: string;
  wheelbase: string;
  groundClearance: string;
  cargoVolume?: string;
}

export interface Performance {
  acceleration: string;
  topSpeed: string;
  brakingDistance: string;
  fuelConsumption: string;
  range?: string;
}

export interface Tires {
  front: string;
  rear: string;
  spare: string;
  pressure: {
    front: string;
    rear: string;
    spare: string;
  };
}

export interface Fluids {
  engineOil: {
    type: string;
    capacity: string;
    changeInterval: string;
  };
  coolant: {
    type: string;
    capacity: string;
    changeInterval: string;
  };
  transmission: {
    type: string;
    capacity: string;
    changeInterval: string;
  };
  brake: {
    type: string;
    capacity: string;
    changeInterval: string;
  };
}

export interface Electrical {
  battery: {
    type: string;
    voltage: string;
    capacity: string;
    location: string;
  };
  alternator: {
    output: string;
    type: string;
  };
}

export interface TechnicalSpecifications {
  engine: EngineSpecs;
  dimensions: Dimensions;
  performance: Performance;
  tires: Tires;
  fluids: Fluids;
  electrical: Electrical;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  registrationNumber: string;
  type: VehicleType;
  status: VehicleStatus;
  purchaseDate: string;
  mileage: string;
  fuelType: FuelType;
  documents: Document[];
  inspections: Inspection[];
  maintenanceHistory: MaintenanceRecord[];
  insuranceInfo: InsuranceInfo | null;
  technicalSpecifications: TechnicalSpecifications | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleFilters {
  search?: string;
  type?: VehicleType;
  status?: VehicleStatus;
  assignedDriver?: string;
  minMileage?: string;
  maxMileage?: string;
  maintenanceNeeded?: boolean;
  inspectionNeeded?: boolean;
  insuranceExpiring?: boolean;
}

export interface VehicleInspection {
  id: string;
  vehicleId: string;
  date: string;
  inspectorName: string;
  inspectorId?: string;
  odometer: number;
  status: InspectionStatus;
  generalComments?: string;
  inspectionItems: InspectionItem[];
  actionRequired: boolean;
  actionDescription?: string;
  actionDueDate?: string;
  actionCompletedDate?: string;
  actionCompletedBy?: string;
  createdAt: string;
  updatedAt: string;
} 
