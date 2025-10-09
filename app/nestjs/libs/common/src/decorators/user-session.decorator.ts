import { JwtPayload } from '@libs/common/utils';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

export const UserSession = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest<Request>();

    let authHeader =
      req.headers['authorization'] || req.headers['Authorization'];

    if (Array.isArray(authHeader)) {
      authHeader = authHeader[0];
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = jwt.decode(token) as JwtPayload;
      return payload;
    } catch {
      return null;
    }
  },
);
