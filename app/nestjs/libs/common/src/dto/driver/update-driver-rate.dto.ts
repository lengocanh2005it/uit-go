import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class UpdateDriverRateDto {
  @IsUUID()
  driverId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsUUID()
  tripId: string;

  @IsUUID()
  reviewerId: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
