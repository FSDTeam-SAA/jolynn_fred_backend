import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

const normalizeKeyword = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateSearchDataDto {
  @ApiProperty({ example: 'plumbing' })
  @Transform(normalizeKeyword)
  @IsString()
  @IsNotEmpty()
  keyword: string;
}
