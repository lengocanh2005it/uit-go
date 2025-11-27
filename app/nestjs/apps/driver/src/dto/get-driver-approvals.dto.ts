import { DriverApprovalStatusEnum } from '@libs/common/enums';
import { IsEnum, IsOptional } from 'class-validator';

export class GetDriverApprovalsDto {
  @IsOptional()
  @IsEnum(DriverApprovalStatusEnum)
  readonly status?: DriverApprovalStatusEnum;
}
