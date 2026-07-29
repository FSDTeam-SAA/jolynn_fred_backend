import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { USER_ROLES } from 'src/app/constants/auth.constants';
import { USERNAME_REGEX } from 'src/app/helpers/username';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeUsernameInput = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : normalizeString({ value });

export class RegisterUserDto {
  @ApiProperty({ example: 'John' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john_doe' })
  @Transform(normalizeUsernameInput)
  @IsString()
  @IsNotEmpty()
  @Matches(USERNAME_REGEX, {
    message:
      'Username must be 3-30 characters and use only lowercase letters, numbers, underscores, or hyphens',
  })
  username: string;

  @ApiProperty({ example: 'john@example.com' })
  @Transform(normalizeString)
  @IsEmail({}, { message: 'Valid email is required' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+12345678901' })
  @Transform(normalizeString)
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  @MinLength(6, { message: 'Confirm password must be at least 6 characters' })
  confirmPassword: string;

  @ApiProperty({ example: true })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  agreementAccepted: boolean;
}

export class RegisterBusinessOwnerDto {
  @ApiProperty({ example: 'Acme Plumbing' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ example: 'Jane Owner' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiProperty({ example: 'acme_owner' })
  @Transform(normalizeUsernameInput)
  @IsString()
  @IsNotEmpty()
  @Matches(USERNAME_REGEX, {
    message:
      'Username must be 3-30 characters and use only lowercase letters, numbers, underscores, or hyphens',
  })
  username: string;

@ApiPropertyOptional({ example: 'owner@example.com' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsEmail({}, { message: 'Valid personal email is required' })
  personalEmail?: string;

  @ApiPropertyOptional({ example: 'contact@acme.com' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsEmail({}, { message: 'Valid business email is required' })
  businessEmail?: string;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsUrl({}, { message: 'Valid website URL is required' })
  businessWebsiteUrl?: string;

 @ApiPropertyOptional({ example: '221B Baker Street' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '15 miles around New York' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  serviceArea?: string;

  @ApiProperty({ example: 'Plumbing' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({
    example: 'Solar Installation',
    description: 'Required when category is Other',
  })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  requestedCategory?: string;

  @ApiProperty({ example: 'New York' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: 'New York' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  @MinLength(6, { message: 'Confirm password must be at least 6 characters' })
  confirmPassword: string;

  @ApiProperty({ example: true })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  agreementAccepted: boolean;
}

export class RegisterExistingUserBusinessOwnerDto extends OmitType(
  RegisterBusinessOwnerDto,
  [
    'ownerName',
    'username',
    'personalEmail',
    'password',
    'confirmPassword',
    'agreementAccepted',
  ] as const,
) {}

export class CreateAuthDto extends RegisterUserDto {}

export class LoginAuthDto {
  @ApiPropertyOptional({
    example: 'john@example.com',
    description: 'Backward-compatible login using email',
  })
  @ValidateIf((object) => !object.identifier)
  @Transform(emptyStringToUndefined)
  @IsEmail({}, { message: 'Valid email is required' })
  email?: string;

  // @ApiPropertyOptional({
  //   example: 'john_doe',
  //   description: 'Preferred login using email or username',
  // })
  // @ValidateIf((object) => !object.email)
  // @Transform(emptyStringToUndefined)
  // @IsString()
  // @IsNotEmpty()
  // identifier?: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @Transform(normalizeString)
  @IsEmail({}, { message: 'Valid email is required' })
  @IsNotEmpty()
  email: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'john@example.com' })
  @Transform(normalizeString)
  @IsEmail({}, { message: 'Valid email is required' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456' })
  @Transform(normalizeString)
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6 digit number' })
  otp: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @Transform(normalizeString)
  @IsEmail({}, { message: 'Valid email is required' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'newsecret123' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldsecret123' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  oldPassword: string;

  @ApiProperty({ example: 'newsecret123' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword: string;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: USER_ROLES })
  @IsEnum(USER_ROLES)
  role: (typeof USER_ROLES)[number];
}
