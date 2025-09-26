import { IsDate, IsUUID } from 'class-validator';

export class CreateTripRequestDto {
  @IsDate()
  readonly expiresTime!: Date;

  @IsUUID('4')
  readonly tripId!: string;
}
