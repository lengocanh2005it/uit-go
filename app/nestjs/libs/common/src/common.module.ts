import envConfig from '@libs/common/configs/env.config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonService } from './common.service';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    RabbitMQModule,
  ],
  providers: [CommonService],
  exports: [CommonService, ConfigModule],
})
export class CommonModule {}
