import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateSponsorDto {
  @ApiProperty({ example: 'Our Gold Sponsor' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'This sponsor has supported us since 2020...',
  })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Sponsor image upload',
  })
  @IsOptional()
  image?: any;

  @ApiPropertyOptional({ example: 'https://example.com/sponsor' })
  @Transform(normalizeString)
  @IsString()
  @IsOptional()
  link?: string;
}
