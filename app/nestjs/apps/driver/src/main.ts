import { generateRmqOptions } from '@libs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { DriverModule } from './driver.module';

async function bootstrap() {
  const app = await NestFactory.create(DriverModule);
  const configService = app.get(ConfigService);
  await app.listen(3003);
  app.connectMicroservice<MicroserviceOptions>(
    generateRmqOptions('driver_service', configService),
  );
  await app.startAllMicroservices();
}
bootstrap();
