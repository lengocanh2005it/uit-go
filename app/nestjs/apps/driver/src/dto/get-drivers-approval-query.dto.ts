import { DriverApprovalStatusEnum } from '@libs/common/enums';
import { IsEnum, IsOptional } from 'class-validator';

export class GetDriversApprovalQueryDto {
  @IsOptional()
  @IsEnum(DriverApprovalStatusEnum)
  readonly status?: DriverApprovalStatusEnum;
}
