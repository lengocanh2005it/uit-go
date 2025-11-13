import { DriverStatusEnum } from '@libs/common/enums';
import { driverStatusMapping } from '@libs/common/utils';
import { Transform } from 'class-transformer';
import { IsEnum, IsUUID } from 'class-validator';

export class UpdateDriverStatusDto {
  @IsEnum(DriverStatusEnum)
  @Transform(({ value }) => driverStatusMapping[value])
  readonly status!: DriverStatusEnum;

  @IsUUID()
  readonly driverId: string;
}
