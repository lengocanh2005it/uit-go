import { DriverStatusEnum } from '@libs/common/enums';
import { driverStatusMapping } from '@libs/common/utils';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateDriverStatusDto {
  @IsEnum(DriverStatusEnum)
  @Transform(({ value }) => driverStatusMapping[value])
  readonly status!: DriverStatusEnum;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly currentLocation?: string;

  @IsUUID()
  readonly driverId: string;
}
