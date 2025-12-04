import { IsUUID } from 'class-validator';

export class GetUserDto {
  @IsUUID()
  readonly userId: string;
}
