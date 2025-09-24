import {
  generateRmqOptions,
  RABBITMQ_QUEUE_SERVICES,
} from '@libs/common/utils';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { RabbitMQService } from './rabbitmq.service';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync({
      clients: RABBITMQ_QUEUE_SERVICES.map((name) => ({
        name,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          generateRmqOptions(name, configService),
      })),
      isGlobal: true,
    }),
  ],
  providers: [RabbitMQService],
  exports: [ClientsModule, RabbitMQService],
})
export class RabbitMQModule {}
