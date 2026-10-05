import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
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

export class CreateBusinessClaimDto {
  @ApiProperty({ description: 'Opaque token delivered to the business email' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MinLength(64)
  @MaxLength(256)
  claimToken: string;

  @ApiProperty({ example: 'owner@acme.example' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Valid business email is required' })
  businessEmail: string;

  @ApiProperty({ example: 'Jane Owner' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  ownerName: string;

  @ApiPropertyOptional({ example: 'https://acme.example' })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsUrl({}, { message: 'Valid website URL is required' })
  businessWebsiteUrl?: string;

  @ApiPropertyOptional({ example: '221B Baker Street' })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;

  @ApiPropertyOptional({ example: 'Twenty miles around Austin' })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(250)
  serviceArea?: string;

  @ApiPropertyOptional({ example: 'Professional residential plumbing.' })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  bio?: string;

  @ApiPropertyOptional({ example: '+1 512 555 0100' })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '78701' })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postcode?: string;

  @ApiPropertyOptional({ example: 'United States' })
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}
