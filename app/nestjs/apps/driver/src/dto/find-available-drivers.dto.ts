import { IsNumber, IsPositive } from 'class-validator';

export class FindAvailableDriversDto {
  @IsNumber()
  @IsPositive()
  readonly lat: number;

  @IsNumber()
  @IsPositive()
  readonly lng: number;
}
