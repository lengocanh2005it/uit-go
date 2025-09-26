import { TripRequestStatusEnum } from '@libs/common/enums';
import { IsEnum } from 'class-validator';

export class UpdateTripRequestStatusDto {
  @IsEnum(TripRequestStatusEnum)
  readonly status!: TripRequestStatusEnum;
}
