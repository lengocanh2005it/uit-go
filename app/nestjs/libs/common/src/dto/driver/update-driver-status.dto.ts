import { DriverStatusEnum } from '@libs/common/enums';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateDriverStatusDto {
  @IsEnum(DriverStatusEnum)
  readonly status!: DriverStatusEnum;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly currentLocation?: string;

  @IsUUID()
  readonly driverId: string;

  @IsOptional()
  @IsUUID()
  readonly currentTripId?: string;
}
