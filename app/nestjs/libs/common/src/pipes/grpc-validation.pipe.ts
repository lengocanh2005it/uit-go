import { Metadata, status } from '@grpc/grpc-js';
import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { validate, ValidationError } from 'class-validator';

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

    const errors = await validate(value, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const message = this.flattenValidationErrors(errors).join(', ');
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message,
      });
    }

    return value;
  }

  private flattenValidationErrors(errors: ValidationError[]): string[] {
    const result: string[] = [];

    for (const error of errors) {
      if (error.constraints) {
        result.push(...Object.values(error.constraints));
      }
      if (error.children && error.children.length) {
        result.push(...this.flattenValidationErrors(error.children));
      }
    }

    return result;
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
