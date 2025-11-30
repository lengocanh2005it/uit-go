import { Metadata, status } from '@grpc/grpc-js';
import { NotificationTypeEnum } from '@libs/common/enums/notification';
import {
  NotificationContent,
  NotificationParams,
} from '@libs/common/utils/types';
import { ConfigService } from '@nestjs/config';
import {
  ClientProxy,
  GrpcOptions,
  RmqOptions,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import * as ngeohash from 'ngeohash';
import { join } from 'path';
import {
  catchError,
  firstValueFrom,
  throwError,
  timeout,
  TimeoutError,
} from 'rxjs';
import { validate as isUuid } from 'uuid';

export function generateRmqOptions(
  serviceName: string,
  configService: ConfigService,
): RmqOptions {
  const url = configService.get<string>(
    'rabbitmq.url',
    'amqp://localhost:5672',
  );

  return {
    transport: Transport.RMQ,
    options: {
      urls: [url],
      queue: `${serviceName.toLowerCase()}_queue`,
      queueOptions: { durable: true },
    },
  };
}

export async function sendWithTimeout<T = any>(
  client: ClientProxy,
  pattern: string,
  payload: any,
  ms = 10000,
): Promise<T> {
  return firstValueFrom(
    client.send<T>(pattern, payload).pipe(
      timeout(ms),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          throw new RpcException({
            code: status.DEADLINE_EXCEEDED,
            message: `Timeout for pattern "${pattern}"`,
          });
        }
        return throwError(() => err);
      }),
    ),
  );
}

export function buildGeoLocation(lat: number, lng: number, prefixLength = 5) {
  const geo_hash = ngeohash.encode(lat, lng);
  const hash_prefix = geo_hash.substring(0, prefixLength);
  return { hash_prefix, geo_hash };
}

export function formatCurrencyVND(amount: number): string {
  if (isNaN(amount)) return '0 VNĐ';
  return `${amount.toLocaleString('vi-VN')} VNĐ`;
}

export const buildSearchPrefixes = (
  lat: number,
  lng: number,
  radiusKm: number,
  prefixLen = 5,
): string[] => {
  const earthRadiusKm = 6371;
  const dLat = (radiusKm / earthRadiusKm) * (180 / Math.PI);
  const dLng =
    ((radiusKm / earthRadiusKm) * (180 / Math.PI)) /
    Math.cos((lat * Math.PI) / 180);

  const minLat = lat - dLat;
  const maxLat = lat + dLat;
  const minLng = lng - dLng;
  const maxLng = lng + dLng;

  const boxes = ngeohash.bboxes(minLat, minLng, maxLat, maxLng, prefixLen);
  return Array.from(new Set(boxes.map((gh) => gh.substring(0, prefixLen))));
};

export function payloadIsObject(value: any): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function generateGrpcOptions(
  serviceName: string,
  protoFilePath: string,
  host = '0.0.0.0',
  port = 50051,
): GrpcOptions {
  return {
    transport: Transport.GRPC,
    options: {
      package: serviceName,
      protoPath: join(process.cwd(), protoFilePath),
      url: `${host}:${port}`,
    },
  };
}

export function isValidUUID(id: string): boolean {
  return isUuid(id);
}

export function timestampToDate(ts?: { seconds: number; nanos: number }): Date {
  if (!ts) return new Date();
  return new Date(ts.seconds * 1000 + ts.nanos / 1e6);
}

export function getIdFromMetadata(
  metadata: Metadata,
  key: string,
  checkValidUUId = false,
): string {
  const rawValue = metadata.get(key)?.[0];

  const id =
    typeof rawValue === 'string'
      ? rawValue
      : rawValue instanceof Buffer
        ? rawValue.toString('utf-8')
        : undefined;

  if (!id) {
    throw new RpcException({
      code: status.INVALID_ARGUMENT,
      message: `Missing ${key} in metadata`,
    });
  }

  if (checkValidUUId && !isValidUUID(id))
    throw new RpcException({
      code: status.INVALID_ARGUMENT,
      message: `Invalid ${key}`,
    });

  return id;
}

export function generateNotificationContent(
  type: NotificationTypeEnum,
  params: NotificationParams,
): NotificationContent {
  switch (type) {
    case NotificationTypeEnum.TRIP_REQUESTED:
      return {
        title: 'New Trip Request',
        message: `New trip requested from ${params.pickupLocation} to ${params.dropoffLocation}.`,
      };
    case NotificationTypeEnum.TRIP_ACCEPTED:
      return {
        title: 'Trip Accepted',
        message: `Driver ${params.driverName} has accepted your trip.`,
      };
    case NotificationTypeEnum.TRIP_ARRIVING:
      return {
        title: 'Driver Arriving',
        message: `Driver ${params.driverName} is arriving at ${params.pickupLocation}.`,
      };
    case NotificationTypeEnum.TRIP_STARTED:
      return {
        title: 'Trip Started',
        message: `Your trip from ${params.pickupLocation} to ${params.dropoffLocation} has started.`,
      };
    case NotificationTypeEnum.TRIP_COMPLETED:
      return {
        title: 'Trip Completed',
        message: `Your trip from ${params.pickupLocation} to ${params.dropoffLocation} has been completed.`,
      };
    case NotificationTypeEnum.TRIP_CANCELED_BY_DRIVER:
      return {
        title: 'Trip Canceled',
        message: `Driver ${params.driverName} has canceled the trip.`,
      };
    case NotificationTypeEnum.TRIP_CANCELED_BY_USER:
      return {
        title: 'Trip Canceled',
        message: `User ${params.userName} has canceled the trip.`,
      };
    case NotificationTypeEnum.SYSTEM_ANNOUNCEMENT:
      return {
        title: 'System Announcement',
        message: `System announcement: ${params.userName || ''}`,
      };
    case NotificationTypeEnum.ACCOUNT_CREATED:
      return {
        title: 'Welcome!',
        message: `Welcome ${params.userName} to the app!`,
      };
    case NotificationTypeEnum.DRIVER_SUBMITTED_DOCUMENTS:
      return {
        title: 'Documents Submitted',
        message: `Driver ${params.driverName} has submitted documents for review.`,
      };
    case NotificationTypeEnum.DRIVER_APPROVED:
      return {
        title: 'Documents Approved',
        message: `Your documents have been approved by the admin.`,
      };
    case NotificationTypeEnum.DRIVER_REJECTED:
      return {
        title: 'Documents Rejected',
        message: `Your documents have been rejected by the admin.`,
      };
    case NotificationTypeEnum.DRIVER_REQUEST_TIMEOUT:
      return {
        title: 'Request Timed Out',
        message: `You did not respond to the trip request from ${params.userName} within 15 seconds. The request has been sent to another driver.`,
      };
    case NotificationTypeEnum.TRIP_RATED:
      return {
        title: 'New Trip Feedback Received',
        message: `Your passenger rated the trip ${params.rating} stars${
          params.comment ? ` and commented: "${params.comment}".` : '.'
        }.`,
      };
    case NotificationTypeEnum.DRIVER_FOUND:
      return {
        title: 'Driver Found',
        message: `We found a driver for your trip. Driver ${params.driverName} is reviewing your request.`,
      };
    default:
      return {
        title: 'New Notification',
        message: 'You have a new notification.',
      };
  }
}

export function convertStringsToDates(
  obj: any,
  keys: string[] = [
    'createdAt',
    'updatedAt',
    'birthDay',
    'licenseExpiry',
    'reviewedDate',
    'lastSeenAt',
  ],
): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj !== 'object') return obj;

  const result: any = Array.isArray(obj) ? [] : {};

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === null || val === undefined) {
      result[key] = val;
    } else if (keys.includes(key) && typeof val === 'string') {
      result[key] = new Date(val);
    } else if (typeof val === 'object') {
      result[key] = convertStringsToDates(val, keys); // recursive
    } else {
      result[key] = val;
    }
  }

  return result;
}
