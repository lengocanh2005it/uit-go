import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  readonly originAddress!: string;

  @IsString()
  @IsNotEmpty()
  readonly destinationAddress!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly note?: string;
}
