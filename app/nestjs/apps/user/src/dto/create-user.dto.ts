import { CreateDriverDto } from '@libs/common/dto/driver';
import { UserRole } from '@user-service/enums';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @Length(10)
  phoneNumber!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  birthDay!: Date;

  @ValidateIf((o) => o.role === UserRole.DRIVER)
  @IsNotEmpty({ message: 'Driver info is required' })
  @ValidateNested()
  @Type(() => CreateDriverDto)
  createDriverDto?: CreateDriverDto;
}
