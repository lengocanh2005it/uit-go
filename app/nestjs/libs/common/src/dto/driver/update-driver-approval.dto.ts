import { DriverApprovalStatusEnum } from '@libs/common/enums';
import { driverApprovalStatusMapping } from '@libs/common/utils';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateDriverApprovalDto {
  @IsEnum(DriverApprovalStatusEnum)
  @Transform(({ value }) => driverApprovalStatusMapping[value])
  status: DriverApprovalStatusEnum;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  note?: string;
}
