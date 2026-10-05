import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessReferralController } from './business-referral.controller';
import { BusinessReferralService } from './business-referral.service';
import {
  BusinessClaim,
  BusinessClaimSchema,
} from './entities/business-claim.entity';
import {
  BusinessReferral,
  BusinessReferralSchema,
} from './entities/business-referral.entity';
import { User, UserSchema } from '../user/entities/user.entity';
import {
  ServiceCategory,
  ServiceCategorySchema,
} from '../service-category/entities/service-category.entity';
import { LocationModule } from '../location/location.module';
import { BusinessReferralNotificationService } from './business-referral-notification.service';
import { BusinessReferralClaimService } from './business-referral-claim.service';
import { AuthModule } from '../auth/auth.module';
import { Review, ReviewSchema } from '../reviews/entities/review.entity';

@Module({
  imports: [
    LocationModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: BusinessReferral.name, schema: BusinessReferralSchema },
      { name: BusinessClaim.name, schema: BusinessClaimSchema },
      { name: User.name, schema: UserSchema },
      { name: ServiceCategory.name, schema: ServiceCategorySchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
  ],
  controllers: [BusinessReferralController],
  providers: [
    BusinessReferralService,
    BusinessReferralNotificationService,
    BusinessReferralClaimService,
  ],
  exports: [
    BusinessReferralService,
    BusinessReferralNotificationService,
    BusinessReferralClaimService,
    MongooseModule,
  ],
})
export class BusinessReferralModule {}
