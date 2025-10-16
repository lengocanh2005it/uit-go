import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOutboxDto {
  @IsString()
  @IsNotEmpty()
  readonly eventType!: string;

  @IsNotEmpty()
  readonly payload!: any;

  @IsUUID('4')
  readonly aggregateId!: string;

  @IsString()
  @IsNotEmpty()
  readonly aggregateType!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly errorMessage?: string;
}
