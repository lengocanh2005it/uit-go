import { RabbitMQService } from '@libs/common/rabbitmq/rabbitmq.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(private readonly rabbitMQService: RabbitMQService) {}

  public getMe = async () => {
    return {
      id: 'id-123',
      fullName: 'Ngoc Anh',
    };
  };
}
