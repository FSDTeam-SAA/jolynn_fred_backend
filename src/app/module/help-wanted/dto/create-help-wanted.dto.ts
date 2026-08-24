import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : normalizeString({ value });

export class CreateHelpWantedDto {
  @ApiProperty({ example: 'john_doe' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'john@example.com' })
  @Transform(normalizeString)
  @IsEmail({}, { message: 'Valid email is required' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '10001' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  zipcode: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsOptional()
  @Transform(normalizeString)
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'New York City' })
  @IsOptional()
  @Transform(normalizeString)
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Plumbing' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    example: '$500 - $1,000',
    description: 'Expected budget range for the requested service',
  })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  budgetRange: string;

  @ApiPropertyOptional({
    example: 'Solar Installation',
    description: 'Required when category is Other',
  })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  requestedCategory?: string;

  @ApiPropertyOptional({ example: '+12345678901' })
  @IsOptional()
  @Transform(normalizeString)
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Please add plumbing service in my area...' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Up to 10 images for the help wanted request',
  })
  @IsOptional()
  images?: string[];
}
