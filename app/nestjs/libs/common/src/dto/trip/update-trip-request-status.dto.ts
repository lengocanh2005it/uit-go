import { TripRequestStatusEnum } from '@libs/common/enums';
import { tripRequestStatusMapping } from '@libs/common/utils';
import { Transform } from 'class-transformer';
import { IsEnum, IsUUID } from 'class-validator';

export class UpdateTripRequestStatusDto {
  @IsEnum(TripRequestStatusEnum)
  @Transform(({ value }) => tripRequestStatusMapping[value])
  readonly status!: TripRequestStatusEnum;

  @IsUUID()
  readonly tripRequestId: string;
}
