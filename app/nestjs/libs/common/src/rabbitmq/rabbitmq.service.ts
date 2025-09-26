import { sendWithTimeout, ServiceName } from '@libs/common/utils';
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RabbitMQService {
  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
    @Inject('TRIP_SERVICE') private readonly tripClient: ClientProxy,
    @Inject('DRIVER_SERVICE') private readonly driverClient: ClientProxy,
    @Inject('LOCATION_SERVICE') private readonly locationClient: ClientProxy,
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

  public emit<T = any>(service: ServiceName, pattern: string, data: any) {
    const client = this.getClient(service);
    return client.emit<T>(pattern, data);
  }

  private getClient(service: ServiceName): ClientProxy {
    switch (service) {
      case 'USER_SERVICE':
        return this.userClient;
      case 'TRIP_SERVICE':
        return this.tripClient;
      case 'DRIVER_SERVICE':
        return this.driverClient;
      case 'LOCATION_SERVICE':
        return this.locationClient;
      default:
        throw new Error(`Unknown service ${service}`);
    }
  }
}
