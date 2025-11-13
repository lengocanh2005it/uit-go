import { IsUUID } from 'class-validator';

export class MarkAsReadDto {
  @IsUUID()
  readonly notificationId: string;
}
