export interface DriverLocationKey {
  hashPrefix: string;
  driverId: string;
}

export interface DriverLocation extends DriverLocationKey {
  geoHash: string;
  lat: number;
  lng: number;
  createdAt: Date;
  updatedAt: Date;
}
