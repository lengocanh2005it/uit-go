import { status } from '@grpc/grpc-js';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { validate as isValidUUID } from 'uuid';

export const GrpcUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const metadata: any = ctx.switchToRpc().getContext();

    const rawUserId = metadata.get('user-id')?.[0];
    const userId =
      typeof rawUserId === 'string' ? rawUserId : rawUserId?.toString('utf-8');

    if (!userId) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Missing user-id in metadata',
      });
    }

    if (!isValidUUID(userId)) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Invalid user ID format',
      });
    }

    return userId;
  },
);
