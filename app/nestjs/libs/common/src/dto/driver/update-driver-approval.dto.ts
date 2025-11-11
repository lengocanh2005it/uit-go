import { DriverApprovalStatusEnum } from '@libs/common/enums';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateDriverApprovalDto {
  @IsEnum(DriverApprovalStatusEnum)
  status: DriverApprovalStatusEnum;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  note?: string;
}
