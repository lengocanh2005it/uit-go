import { generateRmqOptions } from '@libs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { UserModule } from './user.module';

async function bootstrap() {
  const app = await NestFactory.create(UserModule);
  const configService = app.get(ConfigService);
  await app.listen(3001);
  app.connectMicroservice<MicroserviceOptions>(
    generateRmqOptions('user_service', configService),
  );
  await app.startAllMicroservices();
}
bootstrap();
