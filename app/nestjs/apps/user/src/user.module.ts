import { Module } from '@nestjs/common';
import { GrpcClientModule } from '@shared/grpc-client/grpc-client.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'user-db',
      port: 5432,
      username: 'user',
      password: 'password',
      database: 'user_db',
      entities: [User],
      synchronize: true,
    }),
    GrpcClientModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
