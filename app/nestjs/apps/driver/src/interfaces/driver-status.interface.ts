export interface DriverStatusKey {
    driverId: string;
}

export interface VehicleCached {
    vehicleId: string;
    plateNumber: string;
    brand: string;
    model: string;
}

export interface DriverStatus extends DriverStatusKey {
    status: string;
    lastSeenAt: string;
    currentTripId?: string;
    vehicleCached?: VehicleCached;
    createdAt: Date;
    updatedAt: Date;
}