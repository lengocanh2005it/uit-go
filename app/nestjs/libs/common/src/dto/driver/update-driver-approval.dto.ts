import { DriverApprovalStatusEnum } from '@libs/common/enums';
import { driverApprovalStatusMapping } from '@libs/common/utils';
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
  @Transform(({ value }) => driverApprovalStatusMapping[value])
  readonly status: DriverApprovalStatusEnum;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly note?: string;

  @IsUUID()
  readonly driverApprovalId: string;
}
