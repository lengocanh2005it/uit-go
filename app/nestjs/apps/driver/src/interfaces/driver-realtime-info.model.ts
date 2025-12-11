import { VehicleCached } from '@/driver/src/interfaces';
import { DriverStatusEnum } from '@libs/common/enums';

export interface DriverRealtimeKey {
  driverId: string;
}

export interface DriverRealtimeInfo extends DriverRealtimeKey {
  cellToken: string;
  lat: number;
  lng: number;
  status: DriverStatusEnum;
  vehicle?: VehicleCached;
  createdAt: Date;
  updatedAtDate: Date;
}
