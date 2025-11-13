import { IsUUID } from 'class-validator';

export class GetDriverInfoDetailByIdDto {
  @IsUUID()
  readonly driverId: string;
}
