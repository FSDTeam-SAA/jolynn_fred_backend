import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  BUSINESS_CLAIM_STATUSES,
  type BusinessClaimStatus,
} from '../constants/business-referral.constants';

export type BusinessClaimDocument = HydratedDocument<BusinessClaim>;

@Schema({ timestamps: true })
export class BusinessClaim {
  @Prop({
    type: Types.ObjectId,
    ref: 'BusinessReferral',
    required: true,
  })
  referralId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  claimantUserId?: Types.ObjectId;

  @Prop({ required: true, trim: true, lowercase: true })
  businessEmail: string;

  @Prop({ required: true, select: false, unique: true })
  tokenHash: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({
    type: String,
    enum: BUSINESS_CLAIM_STATUSES,
    default: 'pending_verification',
    index: true,
  })
  status: BusinessClaimStatus;

  @Prop()
  verifiedAt?: Date;

  @Prop()
  approvedAt?: Date;
}

export const BusinessClaimSchema = SchemaFactory.createForClass(BusinessClaim);

BusinessClaimSchema.index({ referralId: 1, createdAt: -1 });
BusinessClaimSchema.index({ claimantUserId: 1, createdAt: -1 });
BusinessClaimSchema.index({ referralId: 1 }, { unique: true });
BusinessClaimSchema.index({ status: 1, expiresAt: 1 });
