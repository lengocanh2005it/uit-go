import { generateRmqOptions, SERVICES } from '@libs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
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
    generateRmqOptions(SERVICES.USER_SERVICE.toLowerCase(), configService),
  );
  await app.startAllMicroservices();
  await app.listen(PORT, () => {
    console.log(`UserService is running.`);
  });
}
bootstrap();
