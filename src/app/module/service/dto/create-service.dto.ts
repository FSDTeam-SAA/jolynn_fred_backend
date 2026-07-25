import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : normalizeString({ value });

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
