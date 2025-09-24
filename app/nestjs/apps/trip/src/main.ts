import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { TripModule } from './trip.module';
import { generateRmqOptions } from '@libs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(TripModule);
  const configService = app.get(ConfigService);
  await app.listen(3002);
  app.connectMicroservice<MicroserviceOptions>(
    generateRmqOptions('trip_service', configService),
  );
  await app.startAllMicroservices();
}
bootstrap();
