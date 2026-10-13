import { HttpException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { BusinessProfileProvisioningService } from '../auth/business-profile-provisioning.service';
import { User, UserDocument } from '../user/entities/user.entity';
import { Review, ReviewDocument } from '../reviews/entities/review.entity';
import { CreateBusinessClaimDto } from './dto/create-business-claim.dto';
import {
  BusinessClaim,
  BusinessClaimDocument,
} from './entities/business-claim.entity';
import {
  BusinessReferral,
  BusinessReferralDocument,
} from './entities/business-referral.entity';

type ClaimBusinessResult = {
  referralId: string;
  claimStatus: 'claimed';
  businessOwnerId: string;
  username?: string;
  profileUrl: string;
  activeRole: 'businessOwner';
  nextAction: 'switch_profile';
  idempotent: boolean;
};

@Injectable()
export class BusinessReferralClaimService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(BusinessReferral.name)
    private readonly businessReferralModel: Model<BusinessReferralDocument>,
    @InjectModel(BusinessClaim.name)
    private readonly businessClaimModel: Model<BusinessClaimDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    private readonly businessProfileProvisioningService: BusinessProfileProvisioningService,
  ) {}

  private async convertReferralReview(
    referral: BusinessReferralDocument,
    businessOwner: UserDocument,
    session: ClientSession,
  ) {
    const existingReferralReview = await this.reviewModel
      .findOne({ sourceReferralId: referral._id })
      .session(session);
    if (existingReferralReview) return existingReferralReview;

    const reviewSnapshot = {
      sourceReferralId: referral._id,
      businessId: businessOwner._id,
      reviewerName: referral.referrerName || 'Community member',
      reviewerAvatar: referral.referrerAvatar,
      businessName: referral.businessName,
      rating: referral.rating,
      message: referral.review,
    };

    if (referral.referredByUserId) {
      const existingReviewerReview = await this.reviewModel
        .findOne({
          businessId: businessOwner._id,
          reviewerId: referral.referredByUserId,
        })
        .session(session);

      if (existingReviewerReview) {
        return this.reviewModel.findByIdAndUpdate(
          existingReviewerReview._id,
          {
            $set: {
              ...reviewSnapshot,
              reviewerId: referral.referredByUserId,
            },
          },
          { new: true, session, runValidators: true },
        );
      }
    }

    const [createdReview] = await this.reviewModel.create(
      [
        {
          ...reviewSnapshot,
          reviewerId: referral.referredByUserId,
          createdAt: referral.get('createdAt'),
        },
      ],
      { session },
    );
    return createdReview;
  }

  private toObjectId(id: string, label: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, 400);
    }
    return new Types.ObjectId(id);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildResult(
    referral: BusinessReferralDocument,
    user: UserDocument,
    idempotent: boolean,
  ): ClaimBusinessResult {
    return {
      referralId: referral.id,
      claimStatus: 'claimed' as const,
      businessOwnerId: user.id,
      username: user.username,
      profileUrl: user.username
        ? `/${encodeURIComponent(user.username)}`
        : `/services/businesses/${user.id}`,
      activeRole: 'businessOwner' as const,
      nextAction: 'switch_profile' as const,
      idempotent,
    };
  }

  async claimBusiness(
    referralId: string,
    claimantUserId: string,
    dto: CreateBusinessClaimDto,
  ) {
    const referralObjectId = this.toObjectId(
      referralId,
      'business referral id',
    );
    const claimantObjectId = this.toObjectId(claimantUserId, 'claimant id');
    const tokenHash = this.hashToken(dto.claimToken);
    const session = await this.connection.startSession();
    let result: ClaimBusinessResult | undefined;
    let expiredClaimId: Types.ObjectId | undefined;

    try {
      result = await session.withTransaction(
        async (): Promise<ClaimBusinessResult> => {
          const claim = await this.businessClaimModel
            .findOne({ referralId: referralObjectId, tokenHash })
            .select('+tokenHash')
            .session(session);
          if (!claim) throw new HttpException('Claim link is invalid', 404);

          // MongoDB transactions do not support parallel operations on the
          // same session, so these reads intentionally remain sequential.
          const referral = await this.businessReferralModel
            .findById(referralObjectId)
            .session(session);
          const user = await this.userModel
            .findById(claimantObjectId)
            .session(session);
          if (!referral || referral.listingStatus !== 'published') {
            throw new HttpException('Business referral not found', 404);
          }
          if (!user) throw new HttpException('User not found', 404);

          if (claim.status === 'approved') {
            if (
              claim.claimantUserId?.equals(user._id) &&
              referral.claimStatus === 'claimed' &&
              referral.claimedByUserId?.equals(user._id)
            ) {
              return this.buildResult(referral, user, true);
            }
            throw new HttpException('Claim link has already been used', 410);
          }
          if (
            claim.status === 'expired' ||
            claim.expiresAt.getTime() <= Date.now()
          ) {
            expiredClaimId = claim._id;
            throw new HttpException('Claim link has expired', 410);
          }
          if (referral.claimStatus !== 'unclaimed') {
            throw new HttpException(
              'This business has already been claimed',
              409,
            );
          }

          const accountEmail = user.email.trim().toLowerCase();
          const referralEmail = referral.businessEmail.trim().toLowerCase();
          const submittedEmail = dto.businessEmail.trim().toLowerCase();
          if (!user.emailVerified) {
            throw new HttpException(
              'Verify your account email before claiming this business',
              403,
            );
          }
          if (
            accountEmail !== referralEmail ||
            submittedEmail !== referralEmail
          ) {
            throw new HttpException(
              'Your verified account email must match the referred business email',
              403,
            );
          }

          const otherClaimedReferral = await this.businessReferralModel
            .findOne({
              _id: { $ne: referral._id },
              claimedByUserId: user._id,
              claimStatus: 'claimed',
            })
            .session(session);
          if (otherClaimedReferral) {
            throw new HttpException(
              'This account already owns another claimed referral profile',
              409,
            );
          }

          const lockedClaim = await this.businessClaimModel.findOneAndUpdate(
            {
              _id: claim._id,
              status: 'pending_verification',
              $or: [
                { claimantUserId: { $exists: false } },
                { claimantUserId: user._id },
              ],
            },
            { $set: { claimantUserId: user._id, verifiedAt: new Date() } },
            { new: true, session },
          );
          if (!lockedClaim) {
            throw new HttpException(
              'Another claim is already in progress',
              409,
            );
          }

          const { user: businessOwner } =
            await this.businessProfileProvisioningService.provisionForExistingAccount(
              user._id,
              {
                businessName: referral.businessName,
                ownerName: dto.ownerName,
                businessEmail: referral.businessEmail,
                businessWebsiteUrl: dto.businessWebsiteUrl,
                serviceArea: dto.serviceArea,
                phoneNumber: dto.phoneNumber ?? referral.businessPhone,
                country: dto.country,
                city: referral.city,
                state: referral.state,
                address: dto.address,
                postcode: dto.postcode,
                profilePicture: referral.image.url,
                bio: dto.bio,
                category: referral.categoryName,
                requestedCategory: null,
                serviceCategoryId: referral.serviceCategoryId,
                status: 'active',
                sourceReferralId: referral._id,
              },
              { allowExistingBusinessProfile: true, session },
            );

          await this.convertReferralReview(referral, businessOwner, session);

          const claimedAt = new Date();
          const claimedReferral =
            await this.businessReferralModel.findOneAndUpdate(
              { _id: referral._id, claimStatus: 'unclaimed' },
              {
                $set: {
                  claimStatus: 'claimed',
                  claimedByUserId: businessOwner._id,
                  claimedAt,
                },
              },
              { new: true, session },
            );
          if (!claimedReferral) {
            throw new HttpException(
              'This business has already been claimed',
              409,
            );
          }

          const approvedClaim = await this.businessClaimModel.findOneAndUpdate(
            {
              _id: claim._id,
              claimantUserId: businessOwner._id,
              status: 'pending_verification',
            },
            { $set: { status: 'approved', approvedAt: claimedAt } },
            { new: true, session },
          );
          if (!approvedClaim) {
            throw new HttpException('Unable to finalize business claim', 409);
          }

          return this.buildResult(claimedReferral, businessOwner, false);
        },
      );
    } catch (error) {
      if (expiredClaimId) {
        await this.businessClaimModel
          .updateOne({ _id: expiredClaimId }, { $set: { status: 'expired' } })
          .catch(() => undefined);
      }
      throw error;
    } finally {
      await session.endSession();
    }

    if (!result)
      throw new HttpException('Unable to complete business claim', 500);
    return result;
  }
}
