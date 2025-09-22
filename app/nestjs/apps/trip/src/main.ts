import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { TripModule } from './trip.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    TripModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'trip',
        protoPath: join(process.cwd(), '/proto/trip.proto'),
        url: '0.0.0.0:50052',
      },
    },
  );
  await app.listen();
}
bootstrap();
