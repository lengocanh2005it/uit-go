import { DriverStatusEnum } from '@libs/common/enums';
import { IsEnum, IsOptional } from 'class-validator';

export class GetDriversDto {
  @IsOptional()
  @IsEnum(DriverStatusEnum)
  readonly status?: DriverStatusEnum;
}
