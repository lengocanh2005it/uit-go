import { CommonModule } from '@libs/common';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutbotEventProcessor } from '@user-service/processors';
import { OutboxEventProducer } from '@user-service/producers';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import envConfig from './configs/env.config';
import { OutboxEvent, User, UserProfile } from './entities';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { QueueNames } from '@libs/common/constants';
import { PrometheusModule } from '@willsoto/nestjs-prometheus'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    TypeOrmModule.forFeature([User, UserProfile, OutboxEvent]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host', 'localhost'),
        port: configService.get<number>('database.port', 5432),
        username: configService.get<string>('database.username', 'user'),
        password: configService.get<string>('database.password', 'password'),
        database: configService.get<string>('database.name', 'user_db'),
        entities: [User, UserProfile, OutboxEvent],
        synchronize: true,
        autoLoadEntities: true,
        logging: false,
        namingStrategy: new SnakeNamingStrategy(),
      }),
    }),
    BullModule.registerQueue({
      name: QueueNames.OUTBOX_EVENT_QUEUE,
    }),
    CommonModule,
    PrometheusModule.register()
  ],
  controllers: [UserController],
  providers: [UserService, OutbotEventProcessor, OutboxEventProducer],
})
export class UserModule { }
