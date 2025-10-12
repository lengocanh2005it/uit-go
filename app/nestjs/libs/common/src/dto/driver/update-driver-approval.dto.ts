import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { DriverApprovalStatusEnum } from '@libs/common/enums';

export class UpdateDriverApprovalDto {
    @IsUUID()
    @IsNotEmpty()
    driverId: string;

    @IsEnum(DriverApprovalStatusEnum)
    status: DriverApprovalStatusEnum;

    @IsOptional()
    @IsString()
    note?: string;
}
