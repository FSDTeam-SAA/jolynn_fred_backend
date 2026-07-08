import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
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

export class CreateGallaryDto {
  @ApiProperty({ example: 'Bathroom Projects' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Gallary images',
  })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({
    example: ['cloudinary-public-id-1'],
    description: 'Optional public ids to remove during update',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }

    return value;
  })
  @IsArray()
  @IsString({ each: true })
  removeImagePublicIds?: string[];
}
