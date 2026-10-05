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
  type BusinessReferralClaimStatus,
} from '../../business-referral/constants/business-referral.constants';

const normalizeOptionalString = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized || undefined;
};

export const BUSINESS_DISCOVERY_LISTING_TYPES = [
  'all',
  'registered',
  'referred',
] as const;
export type BusinessDiscoveryListingType =
  (typeof BUSINESS_DISCOVERY_LISTING_TYPES)[number];

export const BUSINESS_DISCOVERY_SORT_FIELDS = [
  'createdAt',
  'rating',
  'businessName',
] as const;
export type BusinessDiscoverySortField =
  (typeof BUSINESS_DISCOVERY_SORT_FIELDS)[number];

export class SearchBusinessesDto {
  @ApiPropertyOptional()
  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  searchTerm?: string;

  @ApiPropertyOptional({ description: 'Search by a service title or keyword' })
  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  service?: string;

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

  @ApiPropertyOptional({
    description: 'Matches city, state, country, address, or service area',
  })
  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  location?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  minimumRating?: number;

  @ApiPropertyOptional({ enum: BUSINESS_DISCOVERY_LISTING_TYPES })
  @IsOptional()
  @IsEnum(BUSINESS_DISCOVERY_LISTING_TYPES)
  listingType?: BusinessDiscoveryListingType;

  @ApiPropertyOptional({ enum: BUSINESS_REFERRAL_CLAIM_STATUSES })
  @IsOptional()
  @IsEnum(BUSINESS_REFERRAL_CLAIM_STATUSES)
  claimStatus?: BusinessReferralClaimStatus;

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

  @ApiPropertyOptional({ enum: BUSINESS_DISCOVERY_SORT_FIELDS })
  @IsOptional()
  @IsEnum(BUSINESS_DISCOVERY_SORT_FIELDS)
  sortBy?: BusinessDiscoverySortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
