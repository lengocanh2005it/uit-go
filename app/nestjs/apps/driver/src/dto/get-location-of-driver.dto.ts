import { IsUUID } from 'class-validator';

export class GetLocationOfDriverDto {
  @IsUUID()
  readonly driverId: string;
}
