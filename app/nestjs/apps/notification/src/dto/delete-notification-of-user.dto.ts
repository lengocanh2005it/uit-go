import { IsUUID } from 'class-validator';

export class DeleteNotificationOfUserDto {
  @IsUUID()
  readonly notificationId: string;
}
