import { IsString, IsNotEmpty } from 'class-validator';

export class GetEstimateDto {
  @IsString()
  @IsNotEmpty()
  readonly originAddress!: string;

  @IsString()
  @IsNotEmpty()
  readonly destinationAddress!: string;
}
