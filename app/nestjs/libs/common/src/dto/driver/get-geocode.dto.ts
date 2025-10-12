import { IsNotEmpty, IsString } from 'class-validator';

export class GetGeocodeDto {
  @IsString()
  @IsNotEmpty()
  readonly address!: string;
}
