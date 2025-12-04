import { TripStatusEnum } from '@libs/common/enums';
import { IsEnum, IsOptional } from 'class-validator';

export class GetTripsDto {
  @IsOptional()
  @IsEnum(TripStatusEnum)
  readonly status: TripStatusEnum;
}
