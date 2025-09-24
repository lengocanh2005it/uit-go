import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  readonly destination_address!: string;
}
