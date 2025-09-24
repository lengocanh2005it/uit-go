import {
  InjectRabbitMqService,
  InjectRedisService,
} from '@libs/common/decorators';
import { RabbitMQService } from '@libs/common/rabbitmq/rabbitmq.service';
import { RedisService } from '@libs/common/redis/redis.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(
    @InjectRabbitMqService() private readonly rabbitMQService: RabbitMQService,
    @InjectRedisService() private readonly redisService: RedisService,
  ) {}

  public getMe = async () => {
    return {
      id: 'id-123',
      fullName: 'Ngoc Anh',
    };
  };
}
