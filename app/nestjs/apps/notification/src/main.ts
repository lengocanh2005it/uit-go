import {
  generateGrpcOptions,
  generateRmqOptions,
  SERVICES,
} from '@libs/common';
import { NOTIFICATION_PROTO_PATH } from '@libs/common/constants';
import { protobufPackage } from '@libs/common/proto/notification';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { NotificationModule } from './notification.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  const configService = app.get(ConfigService);
  const PORT = configService.get<number>('port', 3004);
  app.connectMicroservice<MicroserviceOptions>(
    generateGrpcOptions(
      protobufPackage,
      NOTIFICATION_PROTO_PATH,
      '0.0.0.0',
      50054,
    ),
  );
  app.connectMicroservice<MicroserviceOptions>(
    generateRmqOptions(
      SERVICES.NOTIFICATION_SERVICE.toLowerCase(),
      configService,
    ),
  );
  await app.startAllMicroservices();
  await app.listen(PORT, () => {
    console.log(`NotificationService is running.`);
  });
}
bootstrap();
