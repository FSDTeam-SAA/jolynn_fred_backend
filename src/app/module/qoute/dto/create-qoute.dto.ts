import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateQouteDto {
  @ApiProperty({ example: '6871aa22bb33cc44dd55ee66' })
  @Transform(normalizeString)
  @IsMongoId({ message: 'Valid business owner id is required' })
  businessOwnerId: string;

  @ApiProperty({ example: 'John Doe' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @Transform(normalizeString)
  @IsEmail({}, { message: 'Valid email is required' })
  email: string;

  @ApiPropertyOptional({ example: '+1 512-555-0000' })
  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(30)
  phoneNumber?: string;

  @ApiProperty({ example: 'Emergency Plumbing' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  serviceNeeded: string;

  @ApiProperty({
    example:
      'Need urgent pipe repair in the kitchen and a quick estimate for replacement options.',
  })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  projectDetails: string;
}
