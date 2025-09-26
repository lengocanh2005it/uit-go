import { TUserSession } from '@libs/common/utils';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const UserSession = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const user = (
      context.switchToHttp().getRequest<Request>() as Request & {
        user: TUserSession;
      }
    ).user;

    return user;
  },
);
