import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  QOUTE_STATUSES,
  type QouteStatus,
} from '../entities/qoute.entity';

const normalizeOptionalString = ({ value }: { value: unknown }) =>
  value === undefined || value === '' || value === null
    ? undefined
    : typeof value === 'string'
      ? value.trim()
      : value;

export class UpdateQouteDto {
  @ApiPropertyOptional({ enum: QOUTE_STATUSES, example: 'responded' })
  @IsOptional()
  @IsEnum(QOUTE_STATUSES)
  status?: QouteStatus;

  @ApiPropertyOptional({ example: 'Bathroom Renovation' })
  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  serviceNeeded?: string;

  @ApiPropertyOptional({
    example: 'Updated the request after speaking with the homeowner.',
  })
  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  projectDetails?: string;
}
