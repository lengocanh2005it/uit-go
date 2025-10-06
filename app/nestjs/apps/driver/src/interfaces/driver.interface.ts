import { DriverStatusEnum } from '@libs/common/enums';

export interface DriverKey {
  id: string;
}

export interface Driver extends DriverKey {
  status: DriverStatusEnum;
  rating: number;
  totalTrip: number;
  licenseNumber: string;
  licenseExpiry: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}
