import { RequestTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, RmqOptions, Transport } from '@nestjs/microservices';
import {
  catchError,
  firstValueFrom,
  throwError,
  timeout,
  TimeoutError,
} from 'rxjs';
import * as ngeohash from 'ngeohash';

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
      noAck: false,
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
          throw new RequestTimeoutException(`Timeout for pattern "${pattern}"`);
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
