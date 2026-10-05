import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import config from 'src/app/config';
import sendMailer from 'src/app/helpers/sendMailer';
import { createBusinessReferralClaimEmailTemplate } from 'src/app/helpers/template';
import {
  BUSINESS_REFERRAL_CLAIM_TOKEN_TTL_HOURS,
  BUSINESS_REFERRAL_EMAIL_RESEND_COOLDOWN_MS,
} from './constants/business-referral.constants';
import {
  BusinessClaim,
  BusinessClaimDocument,
} from './entities/business-claim.entity';
import {
  BusinessReferral,
  BusinessReferralDocument,
} from './entities/business-referral.entity';

@Injectable()
export class BusinessReferralNotificationService {
  constructor(
    @InjectModel(BusinessReferral.name)
    private readonly businessReferralModel: Model<BusinessReferralDocument>,
    @InjectModel(BusinessClaim.name)
    private readonly businessClaimModel: Model<BusinessClaimDocument>,
  ) {}

  private toObjectId(id: string, label = 'business referral id') {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, 400);
    }
    return new Types.ObjectId(id);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildUrls(referral: BusinessReferralDocument, token: string) {
    const frontendUrl = (
      config.frontendUrl || 'https://sidequote.cloud'
    ).replace(/\/+$/, '');

    return {
      publicProfileUrl: `${frontendUrl}/business-referrals/${referral.slug}`,
      claimUrl: `${frontendUrl}/business-referrals/claim?token=${encodeURIComponent(token)}`,
    };
  }

  private async markDeliveryFailed(referralId: Types.ObjectId, error: unknown) {
    const failureReason =
      error instanceof Error ? error.message.slice(0, 500) : 'Unknown error';

    return this.businessReferralModel.findByIdAndUpdate(
      referralId,
      {
        $set: {
          emailDeliveryStatus: 'failed',
          emailDeliveryFailureReason: failureReason,
        },
        $unset: { emailProviderMessageId: 1 },
      },
      { new: true },
    );
  }

  async sendClaimNotification(
    referralId: string | Types.ObjectId,
    enforceCooldown = false,
  ) {
    const referral = await this.businessReferralModel.findById(
      typeof referralId === 'string' ? this.toObjectId(referralId) : referralId,
    );

    if (!referral || referral.listingStatus !== 'published') {
      throw new HttpException('Business referral not found', 404);
    }
    if (referral.claimStatus === 'claimed') {
      throw new HttpException('This business has already been claimed', 409);
    }
    if (
      enforceCooldown &&
      referral.emailLastAttemptAt &&
      Date.now() - referral.emailLastAttemptAt.getTime() <
        BUSINESS_REFERRAL_EMAIL_RESEND_COOLDOWN_MS
    ) {
      throw new HttpException(
        'Please wait before requesting another claim email',
        429,
      );
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + BUSINESS_REFERRAL_CLAIM_TOKEN_TTL_HOURS * 60 * 60 * 1000,
    );
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    await this.businessReferralModel.findByIdAndUpdate(referral._id, {
      $set: {
        emailDeliveryStatus: 'pending',
        emailLastAttemptAt: now,
      },
      $inc: { emailDeliveryAttempts: 1 },
      $unset: {
        emailDeliveryFailureReason: 1,
        emailProviderMessageId: 1,
      },
    });

    try {
      await this.businessClaimModel.findOneAndUpdate(
        { referralId: referral._id },
        {
          $set: {
            businessEmail: referral.businessEmail,
            tokenHash,
            expiresAt,
            status: 'pending_verification',
          },
          $unset: {
            claimantUserId: 1,
            verifiedAt: 1,
            approvedAt: 1,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );

      const { publicProfileUrl, claimUrl } = this.buildUrls(referral, token);
      const mailResult = await sendMailer(
        referral.businessEmail,
        `${referral.businessName} was referred on SideQuote`,
        createBusinessReferralClaimEmailTemplate({
          businessName: referral.businessName,
          referrerName: referral.referrerName,
          categoryName: referral.categoryName,
          city: referral.city,
          state: referral.state,
          publicProfileUrl,
          claimUrl,
          expiryHours: BUSINESS_REFERRAL_CLAIM_TOKEN_TTL_HOURS,
        }),
      );

      return this.businessReferralModel.findByIdAndUpdate(
        referral._id,
        {
          $set: {
            emailDeliveryStatus: 'sent',
            ...(mailResult?.id
              ? { emailProviderMessageId: mailResult.id }
              : {}),
          },
          $unset: { emailDeliveryFailureReason: 1 },
        },
        { new: true },
      );
    } catch (error) {
      return this.markDeliveryFailed(referral._id, error);
    }
  }

  async resendClaimNotification(referralId: string, referrerId: string) {
    const referral = await this.businessReferralModel.findOne({
      _id: this.toObjectId(referralId),
      referredByUserId: this.toObjectId(referrerId, 'referrer id'),
      listingStatus: 'published',
    });

    if (!referral) {
      throw new HttpException('Business referral not found', 404);
    }

    const updated = await this.sendClaimNotification(referral._id, true);
    if (!updated) {
      throw new HttpException('Unable to update email delivery status', 500);
    }

    return {
      referralId: updated.id,
      emailDeliveryStatus: updated.emailDeliveryStatus,
      emailDeliveryAttempts: updated.emailDeliveryAttempts,
      emailLastAttemptAt: updated.emailLastAttemptAt,
    };
  }

  async verifyClaimToken(token: string) {
    const tokenHash = this.hashToken(token);
    const claim = await this.businessClaimModel
      .findOne({ tokenHash })
      .select('+tokenHash');

    if (!claim) {
      throw new HttpException('Claim link is invalid', 404);
    }
    if (claim.status === 'approved') {
      throw new HttpException('Claim link has already been used', 410);
    }
    if (claim.status === 'expired' || claim.expiresAt.getTime() <= Date.now()) {
      if (claim.status !== 'expired') {
        await this.businessClaimModel.findByIdAndUpdate(claim._id, {
          $set: { status: 'expired' },
        });
      }
      throw new HttpException('Claim link has expired', 410);
    }

    const referral = await this.businessReferralModel.findOne({
      _id: claim.referralId,
      listingStatus: 'published',
      claimStatus: 'unclaimed',
    });
    if (!referral) {
      throw new HttpException('Business referral is no longer claimable', 410);
    }

    return {
      valid: true,
      expiresAt: claim.expiresAt,
      referralId: referral.id,
      businessName: referral.businessName,
      businessEmail: referral.businessEmail,
      requiredAction: 'authenticate_or_register' as const,
    };
  }
}
