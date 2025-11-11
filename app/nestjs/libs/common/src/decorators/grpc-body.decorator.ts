import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

export const GrpcBody = createParamDecorator(
  (dtoType: any, ctx: ExecutionContext) => {
    const data = ctx.switchToRpc().getData();
    return plainToInstance(dtoType, data);
  },
);
