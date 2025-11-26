import { IsDate, IsNotEmpty, IsString } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @IsDate()
  licenseExpiry: Date;

  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsString()
  @IsNotEmpty()
  color: string;
}
