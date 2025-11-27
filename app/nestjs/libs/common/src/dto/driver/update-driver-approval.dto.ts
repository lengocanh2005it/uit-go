import { DriverApprovalStatusEnum } from '@libs/common/enums';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateDriverApprovalDto {
  @IsEnum(DriverApprovalStatusEnum)
  readonly status: DriverApprovalStatusEnum;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly note?: string;

  @IsUUID()
  readonly driverApprovalId: string;
}
