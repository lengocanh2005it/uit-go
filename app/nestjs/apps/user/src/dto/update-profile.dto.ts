import { Transform } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  birthDay?: Date;
}
