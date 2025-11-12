import { IsUUID } from 'class-validator';

export class CancelTripDto {
  @IsUUID()
  readonly tripId: string;
}
