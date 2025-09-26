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
          throw new RequestTimeoutException(`Timeout for pattern "${pattern}"`);
        }
        return throwError(() => err);
      }),
    ),
  );
}
