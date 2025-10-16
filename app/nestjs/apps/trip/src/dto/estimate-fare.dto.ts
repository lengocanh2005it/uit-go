import { IsNotEmpty, IsString } from 'class-validator';

export class EstimateFareDto {
  @IsString()
  @IsNotEmpty()
  readonly originAddress!: string;

  @IsString()
  @IsNotEmpty()
  readonly destinationAddress!: string;
}
