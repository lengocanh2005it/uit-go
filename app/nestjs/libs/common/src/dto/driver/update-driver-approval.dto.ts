import { DriverApprovalStatusEnum } from '@libs/common/enums';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateDriverApprovalDto {
  @IsUUID()
  driverId: string;

  @IsEnum(DriverApprovalStatusEnum)
  status: DriverApprovalStatusEnum;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  note?: string;
}
