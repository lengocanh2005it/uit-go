import { generateRmqOptions } from '@libs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { DriverModule } from './driver.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(DriverModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  const configService = app.get(ConfigService);
  const PORT = configService.get<number>('services.driver.port', 3003);
  await app.listen(PORT, () => {
    console.log(`DriverService is running.`);
  });
  app.connectMicroservice<MicroserviceOptions>(
    generateRmqOptions('driver_service', configService),
  );
  await app.startAllMicroservices();
}
bootstrap();
