import { CommonModule } from '@libs/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import envConfig from './configs/env.config';
import { User, UserProfile } from './entities';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    TypeOrmModule.forFeature([User, UserProfile]),
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
        entities: [User, UserProfile],
        synchronize: true,
        autoLoadEntities: true,
        logging: false,
        namingStrategy: new SnakeNamingStrategy(),
      }),
    }),
    CommonModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
