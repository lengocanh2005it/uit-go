import { sendWithTimeout, ServiceName, SERVICES } from '@libs/common/utils';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Injectable()
export class RabbitMQService {
  constructor(
    @Inject(SERVICES.USER_SERVICE) private readonly userClient: ClientProxy,
    @Inject(SERVICES.TRIP_SERVICE) private readonly tripClient: ClientProxy,
    @Inject(SERVICES.DRIVER_SERVICE) private readonly driverClient: ClientProxy,
  ) {}

  public send<T = any>(
    service: ServiceName,
    pattern: string,
    data: any,
    ms?: number,
  ) {
    const client = this.getClient(service);
    return sendWithTimeout<T>(client, pattern, data, ms);
  }

  public emit<T = any>(
    service: ServiceName,
    pattern: string,
    data: Record<string, any>,
  ): Observable<T> {
    const client = this.getClient(service);
    return client.emit<T>(pattern, data);
  }

  private getClient(service: ServiceName): ClientProxy {
    switch (service) {
      case SERVICES.USER_SERVICE:
        return this.userClient;
      case SERVICES.TRIP_SERVICE:
        return this.tripClient;
      case SERVICES.DRIVER_SERVICE:
        return this.driverClient;
      default:
        throw new Error(`Unknown service ${service}`);
    }
  }
}
