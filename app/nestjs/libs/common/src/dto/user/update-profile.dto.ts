import { IsOptional, IsString, IsDateString, IsUrl } from "class-validator";

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    fullName?: string

    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsDateString()
    birthDay?: Date

    @IsOptional()
    @IsUrl()
    avatarUrl?: string;
}