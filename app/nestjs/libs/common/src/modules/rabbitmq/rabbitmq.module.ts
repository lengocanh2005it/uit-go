import {
  generateRmqOptions,
  RABBITMQ_QUEUE_SERVICES,
  RABBITMQ_SERVCE_TOKEN,
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
  providers: [
    {
      provide: RABBITMQ_SERVCE_TOKEN,
      useClass: RabbitMQService,
    },
  ],
  exports: [ClientsModule, RABBITMQ_SERVCE_TOKEN],
})
export class RabbitMQModule {}
