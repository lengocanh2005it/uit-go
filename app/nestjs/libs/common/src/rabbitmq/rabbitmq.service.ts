import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RabbitMQService {
  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
    @Inject('TRIP_SERVICE') private readonly tripClient: ClientProxy,
    @Inject('DRIVER_SERVICE') private readonly driverClient: ClientProxy,
  ) {}

  public send<T = any>(
    service: 'USER_SERVICE' | 'TRIP_SERVICE' | 'DRIVER_SERVICE',
    pattern: string,
    data: any,
  ) {
    const client = this.getClient(service);
    return client.send<T>(pattern, data);
  }

  public emit<T = any>(
    service: 'USER_SERVICE' | 'TRIP_SERVICE' | 'DRIVER_SERVICE',
    pattern: string,
    data: any,
  ) {
    const client = this.getClient(service);
    return client.emit<T>(pattern, data);
  }

  private getClient(service: string): ClientProxy {
    switch (service) {
      case 'USER_SERVICE':
        return this.userClient;
      case 'TRIP_SERVICE':
        return this.tripClient;
      case 'DRIVER_SERVICE':
        return this.driverClient;
      default:
        throw new Error(`Unknown service ${service}`);
    }
  }
}
