import { IsNumber } from 'class-validator';

export class ReverseGeoCodeDto {
  @IsNumber()
  readonly lon!: number;

  @IsNumber()
  readonly lat!: number;
}
