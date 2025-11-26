import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RedisService } from '@libs/common/modules/redis/redis.service';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { InjectRedisService } from '@libs/common/decorators';

@Injectable()
export class ThrottlerGrpcGuard implements CanActivate {
  constructor(
    @InjectRedisService() private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata: any = context.switchToRpc().getContext();
    const user = metadata.user ?? null;

    if (!user?.sub?.trim()) return true;

    const handler = context.getHandler();
    const methodName = handler.name;
    const passengerId = user.sub;

    const key = `throttle:passenger:${passengerId}:${methodName}`;
    const count = await this.redisService.getClient().incr(key);

    if (count === 1) {
      await this.redisService.getClient().expire(key, 20);
    }

    if (count > 1) {
      throw new RpcException({
        code: status.RESOURCE_EXHAUSTED,
        message: 'Too many requests, please wait a few seconds.',
      });
    }

    return true;
  }
}
