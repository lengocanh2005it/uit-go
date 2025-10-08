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
  const PORT = configService.get<number>('services.trip.port', 3002);
  await app.listen(PORT, () => {
    console.log(`TripService is running.`);
  });
  app.connectMicroservice<MicroserviceOptions>(
    generateRmqOptions('trip_service', configService),
  );
  await app.startAllMicroservices();
}
bootstrap();
