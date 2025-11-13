import { driverApprovalStatusMapping } from '@libs/common';
import { DriverApprovalStatusEnum } from '@libs/common/enums';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

export class GetDriverApprovalsDto {
  @IsOptional()
  @IsEnum(DriverApprovalStatusEnum)
  @Transform(({ value }) => driverApprovalStatusMapping[value])
  readonly status?: DriverApprovalStatusEnum;
}
