import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class KongService {
  private readonly kongUrl: string;
  private readonly logger = new Logger(KongService.name);

  constructor(private readonly configService: ConfigService) {
    this.kongUrl = this.configService.get<string>(
      'kong_url',
      'http://localhost:8001',
    );
  }

  async createNewConsumer(username: string) {
    try {
      const consumerRes = await axios.post(`${this.kongUrl}/consumers`, {
        username,
      });
      const consumer = consumerRes.data;
      this.logger.log(`✅ Created consumer: ${consumer.id}`);

      const jwtRes = await axios.post(
        `${this.kongUrl}/consumers/${consumer.id}/jwt`,
        {
          key: username,
          secret: this.configService.get<string>(
            'jwt_secret',
            'default-secret',
          ),
        },
      );

      this.logger.log(`✅ Created JWT credential for ${username}`);
      return jwtRes.data;
    } catch (error) {
      this.logger.error(
        '❌ Kong error:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}
