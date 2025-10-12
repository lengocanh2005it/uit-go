import envConfig from '@libs/common/configs/env.config';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CommonService } from './common.service';
import { KongModule } from './kong/kong.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { RedisModule } from './redis/redis.module';

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
    ConfigModule.forRoot({
      load: [envConfig],
    }),
    RabbitMQModule,
    RedisModule,
    KongModule,
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
  ],
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
