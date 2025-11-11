import { TGrpcUser } from '@libs/common/utils';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GrpcUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TGrpcUser | null => {
    const metadata: any = ctx.switchToRpc().getContext();
    return metadata.user ?? null;
  },
);
