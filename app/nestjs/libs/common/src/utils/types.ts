import { Trip } from '@/trip/src/entities';
import { TripStatusEnum } from '@libs/common/enums';
import { ServiceName } from '@libs/common/utils/contants';

export interface AWSQueueMessage<T = any> {
  queueName: string;
  payload: T;
  replyTo: string;
}

export type TUserSession = {
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

export type JwtPayload = TUserSession & {
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
};

export type FindAvailableDriversResponse = {
  count: number;
  drivers: {
    driverId: string;
    lat: number;
    lng: number;
    distanceKm: number;
  }[];
};

export type UpdateDriverStatusMetadata = {
  serviceName: ServiceName;
  eventId: string;
  retryCount: number;
  errorMessage?: string;
};
