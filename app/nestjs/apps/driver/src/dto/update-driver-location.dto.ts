import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateDriverLocationDto {
  @IsString()
  @IsNotEmpty()
  readonly currentLocation: string;
}
