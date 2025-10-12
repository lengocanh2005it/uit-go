import { IsEmail, IsEnum, IsNotEmpty, MinLength, IsOptional, IsString, IsDateString } from "class-validator";
import { UserRole } from "@libs/common/enums";

export class CreateUserDto {
    @IsEmail()
    email: string

    @IsNotEmpty()
    @MinLength(6)
    password: string

    @IsEnum(UserRole)
    role: UserRole

    @IsOptional()
    @IsString()
    licenseNumber?: string;

    @IsOptional()
    @IsDateString()
    licenseExpiry?: string;

    @IsOptional()
    @IsString()
    plateNumber?: string;

    @IsOptional()
    @IsString()
    brand?: string;

    @IsOptional()
    @IsString()
    model?: string;

    @IsOptional()
    @IsString()
    color?: string;
}