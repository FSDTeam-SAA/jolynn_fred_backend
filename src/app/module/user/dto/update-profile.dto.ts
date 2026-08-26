import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { USER_GENDERS } from 'src/app/constants/auth.constants';

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : typeof value === 'string' ? value.trim() : value;

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ enum: USER_GENDERS })
  @IsOptional()
  @IsEnum(USER_GENDERS)
  gender?: 'male' | 'female';

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  postcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  tag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  businessName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  ownerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsEmail()
  businessEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsUrl()
  businessWebsiteUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  serviceArea?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  profilePicture?: unknown;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  backgroundImage?: unknown;
}
