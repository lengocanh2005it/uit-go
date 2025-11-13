import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class RateTripDto {
  @IsUUID()
  readonly tripId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  readonly rating: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly comment?: string;
}
