import { TripStatusEnum } from '@libs/common/enums';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateTripDto {
  @IsOptional()
  @IsEnum(TripStatusEnum)
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
