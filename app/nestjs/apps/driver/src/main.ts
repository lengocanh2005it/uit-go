import { generateRmqOptions, SERVICES } from '@libs/common';
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
  const PORT = configService.get<number>('port', 3003);
  app.connectMicroservice<MicroserviceOptions>(
    generateRmqOptions(SERVICES.DRIVER_SERVICE.toLowerCase(), configService),
  );
  await app.startAllMicroservices();
  await app.listen(PORT, () => {
    console.log(`DriverService is running.`);
  });
}
bootstrap();
