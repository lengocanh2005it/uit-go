import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class DeleteNotificationOfUserDto {
  @IsString()
  @IsNotEmpty()
  readonly notificationId: string;
}
