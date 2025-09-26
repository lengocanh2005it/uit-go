import { generateRmqOptions } from '@libs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { LocationModule } from './location.module';

async function bootstrap() {
  const app = await NestFactory.create(LocationModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  const configService = app.get(ConfigService);
  await app.listen(3004);
  app.connectMicroservice<MicroserviceOptions>(
    generateRmqOptions('location_service', configService),
  );
  await app.startAllMicroservices();
}
bootstrap();
