import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class UpdateSubCategoryDto {
  @ApiPropertyOptional({ example: '66a0f36f5c15b27a5a7f58b2' })
  @IsOptional()
  @IsMongoId()
  serviceId?: string;

  @ApiPropertyOptional({ example: 'Emergency Plumbing' })
  @IsOptional()
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  subcategory?: string;
}
