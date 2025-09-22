import { NestFactory } from '@nestjs/core';
import { DriverModule } from './driver.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    DriverModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'driver',
        protoPath: join(process.cwd(), '/proto/driver.proto'),
        url: '0.0.0.0:50051',
      },
    },
  );
  await app.listen();
}
bootstrap();
