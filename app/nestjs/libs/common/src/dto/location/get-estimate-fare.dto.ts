import { IsNotEmpty, IsString } from 'class-validator';

export class GetEstimateFareDto {
  @IsString()
  @IsNotEmpty()
  readonly startAddress!: string;

  @IsString()
  @IsNotEmpty()
  readonly destinationAddress!: string;
}
