import { IsNotEmpty, IsString } from 'class-validator';

export class GetGeoCodeDto {
  @IsString()
  @IsNotEmpty()
  readonly address!: string;
}
