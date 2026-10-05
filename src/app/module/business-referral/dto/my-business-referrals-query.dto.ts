import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import {
  REFERRAL_EMAIL_DELIVERY_STATUSES,
  type ReferralEmailDeliveryStatus,
} from '../constants/business-referral.constants';
import { SearchBusinessReferralsDto } from './search-business-referrals.dto';

export class MyBusinessReferralsQueryDto extends SearchBusinessReferralsDto {
  @ApiPropertyOptional({ enum: REFERRAL_EMAIL_DELIVERY_STATUSES })
  @IsOptional()
  @IsEnum(REFERRAL_EMAIL_DELIVERY_STATUSES)
  emailDeliveryStatus?: ReferralEmailDeliveryStatus;
}
