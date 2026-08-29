import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsString,
  MaxLength,
} from 'class-validator';

const parseStringArray = ({ value }: { value: unknown }) => {
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
    // Multipart/form clients may submit comma-separated values.
  }

  return normalizedValue.split(',');
};

export class CreateSubCategoriesDto {
  @ApiProperty({ example: '66a0f36f5c15b27a5a7f58b2' })
  @IsMongoId()
  serviceId: string;

  @ApiProperty({
    type: [String],
    example: ['Emergency Plumbing', 'Pipe Repair', 'Drain Cleaning'],
    minItems: 1,
    maxItems: 50,
  })
  @Transform(parseStringArray)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  subcategories: string[];
}
