import { IsBoolean, IsOptional } from 'class-validator';

export class GetNotificationsOfUserDto {
  @IsOptional()
  @IsBoolean()
  readonly read?: boolean;
}
