import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  USER_GENDERS,
  USER_ROLES,
  USER_STATUSES,
} from 'src/app/constants/auth.constants';

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

export class CreateUserDto {

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  password?: string;

  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsEnum(USER_ROLES)
  role?: string;

  @ApiPropertyOptional({ enum: USER_GENDERS })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsEnum(USER_GENDERS)
  gender?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  profilePicture?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsEmail()
  businessEmail?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsUrl()
  businessWebsiteUrl?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  serviceArea?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  postcode?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsDateString()
  dateOfBirth?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  otp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  otpExpiry?: Date;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  verifiedForget?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  agreementAccepted?: boolean;

  @ApiPropertyOptional({ enum: USER_STATUSES })
  @IsString()
  @IsOptional()
  @Transform(emptyStringToUndefined)
  status?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  stripeAccountId?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  tag?: string;
}
