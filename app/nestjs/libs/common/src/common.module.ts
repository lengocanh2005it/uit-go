import envConfig from '@libs/common/configs/env.config';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CommonService } from './common.service';
import { KongModule } from './kong/kong.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { RedisModule } from './redis/redis.module';

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
      isGlobal: true,
      load: [envConfig],
    }),
    RabbitMQModule,
    RedisModule,
    KongModule,
  ],
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
