import { status } from '@grpc/grpc-js';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class JwtGrpcGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const metadata: any = context.switchToRpc().getContext();
    const authHeader = metadata.get('authorization')?.[0];

    if (!authHeader) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Authorization token missing',
      });
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    try {
      const payload = this.jwtService.verify(token);
      (metadata as any).user = payload;
      return true;
    } catch (err) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid token',
      });
    }
  }
}
