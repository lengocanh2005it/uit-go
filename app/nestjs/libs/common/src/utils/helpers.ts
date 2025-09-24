import { ConfigService } from '@nestjs/config';
import { RmqOptions, Transport } from '@nestjs/microservices';

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
