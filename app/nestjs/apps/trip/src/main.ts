import { generateRmqOptions } from '@libs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { TripModule } from './trip.module';

async function bootstrap() {
  const app = await NestFactory.create(TripModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  const configService = app.get(ConfigService);
  await app.listen(3002);
  app.connectMicroservice<MicroserviceOptions>(
    generateRmqOptions('trip_service', configService),
  );
  await app.startAllMicroservices();
}
bootstrap();
