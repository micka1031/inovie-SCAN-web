export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  registrationNumber: string;
  type: 'car' | 'truck' | 'van' | 'motorcycle';
  status: 'active' | 'maintenance' | 'inactive';
  purchaseDate: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  mileage: number;
  fuelType: 'diesel' | 'petrol' | 'electric' | 'hybrid';
  capacity?: number; // Pour les camions/vans
  notes?: string;
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
} 