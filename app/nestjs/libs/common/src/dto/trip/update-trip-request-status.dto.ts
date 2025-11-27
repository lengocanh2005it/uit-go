import { TripRequestStatusEnum } from '@libs/common/enums';
import { IsEnum, IsUUID } from 'class-validator';

export class UpdateTripRequestStatusDto {
  @IsEnum(TripRequestStatusEnum)
  readonly status!: TripRequestStatusEnum;

  @IsUUID()
  readonly tripRequestId: string;
}
