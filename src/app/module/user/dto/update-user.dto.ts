import { Transform } from 'class-transformer';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    example: 'Business information did not meet our platform requirements.',
    description: 'Reason sent by email when an account is rejected',
  })
  @Transform(emptyStringToUndefined)
  reason?: string;

  @Transform(emptyStringToUndefined)
  firstName?: string;

  @Transform(emptyStringToUndefined)
  lastName?: string;

  @Transform(emptyStringToUndefined)
  email?: string;

  @Transform(emptyStringToUndefined)
  password?: string;

  @Transform(emptyStringToUndefined)
  role?: string;

  @Transform(emptyStringToUndefined)
  gender?: string;

  @Transform(emptyStringToUndefined)
  phoneNumber?: string;

  @Transform(emptyStringToUndefined)
  username?: string;

  @Transform(emptyStringToUndefined)
  businessName?: string;

  @Transform(emptyStringToUndefined)
  businessEmail?: string;

  @Transform(emptyStringToUndefined)
  businessWebsiteUrl?: string;

  @Transform(emptyStringToUndefined)
  serviceArea?: string;

  @Transform(emptyStringToUndefined)
  category?: string;

  @Transform(emptyStringToUndefined)
  country?: string;

  @Transform(emptyStringToUndefined)
  city?: string;

  @Transform(emptyStringToUndefined)
  state?: string;

  @Transform(emptyStringToUndefined)
  address?: string;

  @Transform(emptyStringToUndefined)
  postcode?: string;

  @Transform(emptyStringToUndefined)
  bio?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Profile picture file upload',
  })
  @Transform(emptyStringToUndefined)
  profilePicture?: any;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Background image file upload',
  })
  @Transform(emptyStringToUndefined)
  backgroundImage?: any;

  @Transform(emptyStringToUndefined)
  status?: string;

  @Transform(emptyStringToUndefined)
  dateOfBirth?: Date;

  @Transform(emptyStringToUndefined)
  schoolAddress?: string;

  @Transform(emptyStringToUndefined)
  relationship?: string;

  @Transform(emptyStringToUndefined)
  otp?: string;

  @Transform(({ value }) => {
    if (value === '') {
      return undefined;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return value;
  })
  verifiedForget?: boolean;

  @Transform(({ value }) => {
    if (value === '') {
      return undefined;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return value;
  })
  agreementAccepted?: boolean;

  @Transform(emptyStringToUndefined)
  stripeAccountId?: string;
}
