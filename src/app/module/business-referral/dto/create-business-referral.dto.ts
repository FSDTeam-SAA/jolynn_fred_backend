import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const emptyStringToUndefined = ({ value }: { value: unknown }) => {
  const normalized = normalizeString({ value });
  return normalized === '' ? undefined : normalized;
};

export class CreateBusinessReferralDto {
  @ApiPropertyOptional({
    type: 'array',
    maxItems: 3,
    items: { type: 'string', format: 'binary' },
    description: 'Optionally select and upload up to three business images',
  })
  @IsOptional()
  images?: unknown[];

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    deprecated: true,
    description:
      'Legacy single-image field. New integrations should use "images".',
  })
  @IsOptional()
  image?: unknown;

  @ApiProperty({ example: 'Acme Plumbing' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  businessName: string;

  @ApiProperty({ example: '6871aa22bb33cc44dd55ee66' })
  @Transform(normalizeString)
  @IsMongoId({ message: 'Valid service category id is required' })
  serviceCategoryId: string;

  @ApiProperty({ example: 'Texas' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state: string;

  @ApiProperty({ example: 'Austin' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'hello@acme.example' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Valid business email is required' })
  businessEmail: string;

  @ApiPropertyOptional({ example: '+1 512 555 0100' })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  businessPhone?: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    example: 'Excellent service and clear communication throughout the job.',
  })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1500)
  review: string;
}
