import { UserRole } from '@/user/src/enums';
import { IsEnum, IsOptional } from 'class-validator';

export class GetUsersDto {
  @IsOptional()
  @IsEnum(UserRole)
  readonly role?: UserRole;
}
