import { DriverStatusEnum } from '@libs/common/enums';
import { IsEnum } from 'class-validator';

export class UpdateDriverStatusDto {
  @IsEnum(DriverStatusEnum)
  readonly status!: DriverStatusEnum;
}
