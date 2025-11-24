import { Trip } from '@/trip/src/entities';
import { CreateTripDto } from '@libs/common/dto';
import { TripStatusEnum } from '@libs/common/enums';

export interface AWSQueueMessage<T = any> {
  queueName: string;
  payload: T;
  replyTo: string;
}

export type TGrpcUser = {
  sub: string;
  role: string;
};

export type ForbiddenTripStatus =
  | TripStatusEnum.CANCELLED
  | TripStatusEnum.COMPLETED;

export type GetEstimateFareResponse = {
  startAddress: string;
  destinationAddress: string;
  distanceKm: number;
  estimatedFare: number;
  currency: string;
};

export type GetGeocodeResponse = {
  longitude: number;
  latitude: number;
};

export type JwtPayload = TGrpcUser & {
  iat: number;
  exp: number;
};

export interface GetTripsOfDriverResponse {
  data: Trip[];
  afterCursor: string | null;
}

export interface GetServerLocationResponse {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

export type ProcessTripRequestDto = {
  tripRequestId: string;
  sub: string;
};

export type UpdateTripStatusDto = {
  tripId: string;
  sub: string;
  status: TripStatusEnum;
};

export type AssignDriverDto = {
  passengerId: string;
  createTripDto: CreateTripDto;
};

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface NotificationParams {
  userName?: string;
  driverName?: string;
  tripId?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  amount?: number;
  rating?: number;
  comment?: string;
}

export interface NotificationContent {
  title: string;
  message: string;
}
