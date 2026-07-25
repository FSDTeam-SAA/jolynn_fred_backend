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

  @ApiProperty({ example: 'Plumbing' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({
    example: 'Solar Installation',
    description: 'Required when category is Other',
  })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  requestedCategory?: string;

  @ApiProperty({ example: '+12345678901' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Please add plumbing service in my area...' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  message: string;
}
