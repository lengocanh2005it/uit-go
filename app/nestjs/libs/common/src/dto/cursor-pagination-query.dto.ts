import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CursorPaginationQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  afterCursor?: string;
}
