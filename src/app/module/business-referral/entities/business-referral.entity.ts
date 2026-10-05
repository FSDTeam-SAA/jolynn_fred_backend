import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  BUSINESS_REFERRAL_CLAIM_STATUSES,
  BUSINESS_REFERRAL_LISTING_STATUSES,
  REFERRAL_EMAIL_DELIVERY_STATUSES,
  type BusinessReferralClaimStatus,
  type BusinessReferralListingStatus,
  type ReferralEmailDeliveryStatus,
} from '../constants/business-referral.constants';

export type BusinessReferralDocument = HydratedDocument<BusinessReferral>;

@Schema({ _id: false })
export class BusinessReferralImage {
  @Prop({ required: true, trim: true })
  url: string;

  @Prop({ required: true, trim: true })
  publicId: string;
}

const BusinessReferralImageSchema = SchemaFactory.createForClass(
  BusinessReferralImage,
);

@Schema({ timestamps: true })
export class BusinessReferral {
  @Prop({ required: true, trim: true, maxlength: 150 })
  businessName: string;

  @Prop({ required: true, trim: true, lowercase: true })
  normalizedBusinessName: string;

  @Prop({ required: true, trim: true, lowercase: true })
  normalizedState: string;

  @Prop({ required: true, trim: true, lowercase: true })
  normalizedCity: string;

  @Prop({ required: true, trim: true, lowercase: true, unique: true })
  slug: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'ServiceCategory',
    required: true,
    index: true,
  })
  serviceCategoryId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  categoryName: string;

  @Prop({ required: true, trim: true })
  state: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ required: true, trim: true, lowercase: true })
  businessEmail: string;

  @Prop({ trim: true })
  businessPhone?: string;

  @Prop({ type: BusinessReferralImageSchema, required: true })
  image: BusinessReferralImage;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true, trim: true, minlength: 10, maxlength: 1500 })
  review: string;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  referredByUserId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  referrerName: string;

  @Prop({ trim: true })
  referrerAvatar?: string;

  @Prop({
    type: String,
    enum: BUSINESS_REFERRAL_LISTING_STATUSES,
    default: 'published',
    index: true,
  })
  listingStatus: BusinessReferralListingStatus;

  @Prop({
    type: String,
    enum: BUSINESS_REFERRAL_CLAIM_STATUSES,
    default: 'unclaimed',
    index: true,
  })
  claimStatus: BusinessReferralClaimStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  claimedByUserId?: Types.ObjectId;

  @Prop()
  claimedAt?: Date;

  @Prop({
    type: String,
    enum: REFERRAL_EMAIL_DELIVERY_STATUSES,
    default: 'pending',
    index: true,
  })
  emailDeliveryStatus: ReferralEmailDeliveryStatus;

  @Prop({ default: 0, min: 0 })
  emailDeliveryAttempts: number;

  @Prop()
  emailLastAttemptAt?: Date;

  @Prop({ select: false, trim: true })
  emailDeliveryFailureReason?: string;

  @Prop({ trim: true })
  emailProviderMessageId?: string;

  @Prop({ type: Types.ObjectId, ref: 'BusinessReferral', index: true })
  duplicateCandidateOf?: Types.ObjectId;
}

export const BusinessReferralSchema =
  SchemaFactory.createForClass(BusinessReferral);

BusinessReferralSchema.index({ businessEmail: 1 }, { unique: true });
BusinessReferralSchema.index(
  { businessPhone: 1 },
  {
    unique: true,
    partialFilterExpression: { businessPhone: { $type: 'string' } },
  },
);
BusinessReferralSchema.index(
  { normalizedBusinessName: 1, normalizedState: 1, normalizedCity: 1 },
  { unique: true },
);
BusinessReferralSchema.index({
  listingStatus: 1,
  claimStatus: 1,
  serviceCategoryId: 1,
  state: 1,
  city: 1,
  createdAt: -1,
});
BusinessReferralSchema.index({ referredByUserId: 1, createdAt: -1 });
BusinessReferralSchema.index({ claimedByUserId: 1, claimStatus: 1 });
BusinessReferralSchema.index({
  businessName: 'text',
  categoryName: 'text',
  state: 'text',
  city: 'text',
});
