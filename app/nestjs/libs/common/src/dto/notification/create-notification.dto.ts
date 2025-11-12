import { NotificationTypeEnum } from '@libs/common/enums/notification';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsEnum(NotificationTypeEnum)
  readonly type: NotificationTypeEnum;

  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsString()
  @IsNotEmpty()
  readonly message: string;
}
