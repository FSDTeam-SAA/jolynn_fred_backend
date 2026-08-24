import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : normalizeString({ value });

const parseStringArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(normalizedValue);
    if (Array.isArray(parsedValue)) {
      return parsedValue;
    }
  } catch {
    // Multipart forms may submit keywords as comma-separated text.
  }

  return normalizedValue.split(',');
};

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

  @ApiPropertyOptional({
    type: [String],
    example: ['home service', 'house maintenance', 'property repair'],
    description:
      'Related search phrases. Multipart requests may send a JSON array or comma-separated values.',
    maxItems: 20,
  })
  @IsOptional()
  @Transform(parseStringArray)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Optional service category logo image',
  })
  @IsOptional()
  logo?: string;

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
