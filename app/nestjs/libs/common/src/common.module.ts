import { ThrottlerGrpcGuard } from '@libs/common/guards';
import { PulsarModule } from '@libs/common/modules/pulsar/pulsar.module';
import { RedisService } from '@libs/common/modules/redis/redis.service';
import {
  REDIS_SERVICE_TOKEN,
  REDLOCK_RETRY_COUNT,
  REDLOCK_RETRY_DELAY,
} from '@libs/common/utils';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RedlockModule } from 'nestjs-redlock-universal';
import { NodeRedisAdapter } from 'redlock-universal';
import { CommonService } from './common.service';
import { RabbitMQModule } from './modules/rabbitmq/rabbitmq.module';
import { RedisModule } from './modules/redis/redis.module';
import { IoredisAdapter } from 'redlock-universal';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt_secret', ''),
        signOptions: {
          expiresIn: configService.get<string>('jwt_expiration_time', '120s'),
        },
      }),
    }),
    RabbitMQModule,
    RedisModule,
    PulsarModule,
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('bullmq.host', 'redis'),
          port: configService.get<number>('bullmq.port', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    HttpModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get<number>('http.timeout', 15000),
        maxRedirects: configService.get<number>('http.max_redirects', 5),
      }),
    }),
    RedlockModule.forRootAsync({
      imports: [RedisModule],
      inject: [REDIS_SERVICE_TOKEN],
      useFactory: (redisService: RedisService) => ({
        nodes: [new IoredisAdapter(redisService.getClient())],
        defaultTtl: 50000,
        retryAttempts: REDLOCK_RETRY_COUNT,
        retryDelay: REDLOCK_RETRY_DELAY,
      }),
    }),
  ],
  providers: [CommonService, ThrottlerGrpcGuard],
  exports: [CommonService, RedlockModule],
})
export class CommonModule {}
