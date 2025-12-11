export interface DriverLocationKey {
  cellToken: string;
  driverId: string;
}

export interface DriverLocation extends DriverLocationKey {
  lat: number;
  lng: number;
  createdAt: Date;
  updatedAt: Date;
}
