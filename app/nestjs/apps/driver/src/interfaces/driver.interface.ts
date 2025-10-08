import { DriverStatusEnum } from '@libs/common/enums';

export interface DriverKey {
  driverId: string;
}

export interface Driver extends DriverKey {
  userId: string;
  rating: number;
  totalTrip: number;
  licenseNumber: string;
  licenseExpiry: Date;
  createdAt: Date;
  updatedAt: Date;
}
