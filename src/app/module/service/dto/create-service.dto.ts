import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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

export class CreateServiceDto {
  @ApiProperty({
    example: 'Plumbing',
    description:
      'Selected approved service category name, or Other for a missing category',
  })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional({
    example: 'Solar Installation',
    description: 'Required when title is Other',
  })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  @MaxLength(120)
  requestedCategory?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['emergency plumber', 'pipe repair', '24 hour plumbing'],
    description:
      'Business-specific search keywords. Multipart requests may send a JSON array or comma-separated values.',
    maxItems: 20,
  })
  @IsOptional()
  @Transform(parseStringArray)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  keywords?: string[];

  @ApiProperty({
    example: 'Fast and reliable plumbing repairs for urgent emergencies.',
  })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Optional service logo image',
  })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  logo?: string;
}
