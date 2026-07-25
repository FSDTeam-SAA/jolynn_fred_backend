import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : normalizeString({ value });

export class CreateServiceCategoryDto {
  @ApiProperty({ example: 'Plumbing' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Licensed plumbing and repair services' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsNumber()
  sortOrder?: number;
}
