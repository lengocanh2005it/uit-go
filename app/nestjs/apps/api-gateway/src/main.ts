import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
  const configService = app.get(ConfigService);
  const PORT = configService.get<number>('port', 3001);
  await app.listen(PORT, () => {
    console.log(`🚀 API Gateway is running on http://api.localhost:${PORT}`);
  });
}
bootstrap();
