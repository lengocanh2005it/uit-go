import { TripStatusEnum } from '@libs/common/enums';

export interface AWSQueueMessage<T = any> {
  queueName: string;
  payload: T;
  replyTo: string;
}

export type TUserSession = {
  id: string;
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
