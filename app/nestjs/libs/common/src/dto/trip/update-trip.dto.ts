import { TripStatusEnum } from '@libs/common/enums';
import { tripStatusMapping } from '@libs/common/utils';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateTripDto {
  @IsUUID()
  readonly tripId: string;

  @IsOptional()
  @IsEnum(TripStatusEnum)
  @Transform(({ value }) => tripStatusMapping[value])
  readonly status?: TripStatusEnum;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly note?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly destinationAddress?: string;

  @IsOptional()
  @IsNumber()
  readonly fareFinal?: number;
}
