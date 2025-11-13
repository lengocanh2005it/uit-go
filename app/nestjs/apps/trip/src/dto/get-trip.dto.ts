import { IsUUID } from 'class-validator';

export class GetTripDto {
  @IsUUID()
  readonly tripId: string;
}
