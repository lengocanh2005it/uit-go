import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { status, Metadata } from '@grpc/grpc-js';

@Injectable()
export class GrpcValidationPipe implements PipeTransform {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (
      value instanceof Metadata ||
      typeof value !== 'object' ||
      value === null ||
      this.isGrpcContext(value)
    ) {
      return value;
    }

    if (!metatype || !this.toValidate(metatype)) return value;

    const object = plainToInstance(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const message = errors
        .map((e) => Object.values(e.constraints || {}))
        .flat()
        .join(', ');
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message,
      });
    }

    return object;
  }

  private toValidate(metatype: any): boolean {
    const skipTypes: any[] = [String, Boolean, Number, Array, Object];
    return !skipTypes.includes(metatype);
  }

  private isGrpcContext(value: any): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      'metadata' in value &&
      'request' in value
    );
  }
}
