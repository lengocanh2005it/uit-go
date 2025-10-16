import { OutboxStatus } from '@libs/common/enums';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateOutboxEventDto {
  @IsUUID()
  readonly eventId!: string;

  @IsOptional()
  @IsEnum(OutboxStatus)
  readonly status?: OutboxStatus;

  @IsOptional()
  @IsInt()
  readonly retryCount?: number;

  @IsOptional()
  readonly errorMessage?: string;
}
