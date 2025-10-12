import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateDriverDto {
    @IsString()
    userId: string;

    @IsString()
    licenseNumber: string;

    @IsDateString()
    licenseExpiry: Date;

    @IsString()
    plateNumber: string;

    @IsString()
    brand: string;

    @IsString()
    model: string;

    @IsString()
    color: string;
}
