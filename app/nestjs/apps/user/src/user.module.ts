import { Module } from '@nestjs/common';
import { GrpcClientModule } from '@shared/grpc-client/grpc-client.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [GrpcClientModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
