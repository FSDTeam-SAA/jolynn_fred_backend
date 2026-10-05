import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  BUSINESS_REFERRAL_CLAIM_STATUSES,
  BUSINESS_REFERRAL_SORT_FIELDS,
  type BusinessReferralClaimStatus,
  type BusinessReferralSortField,
} from '../constants/business-referral.constants';

const normalizeOptionalString = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized || undefined;
};

export class SearchBusinessReferralsDto {
  @ApiPropertyOptional()
  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  searchTerm?: string;

  @ApiPropertyOptional()
  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsMongoId()
  serviceCategoryId?: string;

  @ApiPropertyOptional()
  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional()
  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ enum: BUSINESS_REFERRAL_CLAIM_STATUSES })
  @IsOptional()
  @IsEnum(BUSINESS_REFERRAL_CLAIM_STATUSES)
  claimStatus?: BusinessReferralClaimStatus;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  minimumRating?: number;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: BUSINESS_REFERRAL_SORT_FIELDS })
  @IsOptional()
  @IsEnum(BUSINESS_REFERRAL_SORT_FIELDS)
  sortBy?: BusinessReferralSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
