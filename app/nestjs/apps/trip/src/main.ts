import { generateGrpcOptions, generateRmqOptions } from '@libs/common';
import { TRIP_PROTO_PATH } from '@libs/common/constants';
import { protobufPackage } from '@libs/common/proto/trip';
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
  const PORT = configService.get<number>('port', 3002);
  app.connectMicroservice<MicroserviceOptions>(
    generateGrpcOptions(protobufPackage, TRIP_PROTO_PATH, '0.0.0.0', 50052),
  );
  app.connectMicroservice<MicroserviceOptions>(
    generateRmqOptions('trip_service', configService),
  );
  await app.startAllMicroservices();
  await app.listen(PORT, () => {
    console.log(`TripService is running.`);
  });
}
bootstrap();
