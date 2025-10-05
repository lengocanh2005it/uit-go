import { CommonModule } from '@libs/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, UserProfile } from './entities';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'user-db',
      port: 5432,
      username: 'user',
      password: 'password',
      database: 'user_db',
      entities: [User, UserProfile],
      synchronize: true,
    }),
    CommonModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
