import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const REQUEST_SERVICE_CATEGORY_SOURCES = [
  'help_wanted',
  'business_registration',
] as const;

type RequestServiceCategorySource =
  (typeof REQUEST_SERVICE_CATEGORY_SOURCES)[number];

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : normalizeString({ value });

export class RequestServiceCategoryDto {
  @ApiProperty({ example: 'Solar Installation' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: REQUEST_SERVICE_CATEGORY_SOURCES,
    example: 'help_wanted',
  })
  @IsEnum(REQUEST_SERVICE_CATEGORY_SOURCES, {
    message: 'source must be one of: help_wanted, business_registration',
  })
  source: RequestServiceCategorySource;

  @ApiPropertyOptional({ example: '66a0f36f5c15b27a5a7f58b2' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  requestedByUserId?: string;
}
