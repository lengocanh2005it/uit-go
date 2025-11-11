import {
  generateGrpcOptions,
  generateRmqOptions,
  SERVICES,
} from '@libs/common';
import { USER_PROTO_PATH } from '@libs/common/constants';
import { protobufPackage } from '@libs/common/proto/user';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { UserModule } from './user.module';

async function bootstrap() {
  const app = await NestFactory.create(UserModule);
  const configService = app.get(ConfigService);
  const PORT = configService.get<number>('port', 3001);
  app.connectMicroservice<MicroserviceOptions>(
    generateGrpcOptions(protobufPackage, USER_PROTO_PATH, '0.0.0.0', 50051),
  );
  app.connectMicroservice<MicroserviceOptions>(
    generateRmqOptions(SERVICES.USER_SERVICE.toLowerCase(), configService),
  );
  await app.startAllMicroservices();
  await app.listen(PORT, () => {
    console.log(`UserService is running.`);
  });
}
bootstrap();
