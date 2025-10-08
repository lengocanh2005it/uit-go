export interface VehicleKey {
  vehicleId: string;
}

export interface Vehicle extends VehicleKey {
  plateNumber: string;
  brand: string;
  model: string;
  color: string;
  driverId: string;
  createdAt: Date;
  updatedAt: Date;
}
