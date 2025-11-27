import { DriverStatusEnum } from '@libs/common/enums';

export interface DriverStatusKey {
  driverId: string;
}

export interface VehicleCached {
  vehicleId: string;
  plateNumber: string;
  brand: string;
  model: string;
  color: string;
}

export interface DriverStatus extends DriverStatusKey {
  status: DriverStatusEnum;
  lastSeenAt: string;
  currentTripId?: string;
  vehicleCached?: VehicleCached;
  createdAt: Date;
  updatedAt: Date;
}
