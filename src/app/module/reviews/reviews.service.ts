import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import type { IFilterParams } from 'src/app/helpers/pick';
import { User, UserDocument } from '../user/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review, ReviewDocument } from './entities/review.entity';
import {
  businessOwnerMembershipFilter,
  getBusinessProfile,
  getPersonalProfile,
} from 'src/app/helpers/account-profile';

const reviewSearchAbleFields = ['message', 'reviewerName', 'businessName'];

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private normalizePayload<T extends CreateReviewDto | UpdateReviewDto>(
    payload: T,
  ) {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([, value]) => value !== undefined && value !== '',
      ),
    ) as T;
  }

  private toObjectId(id: string, label = 'reference') {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, 400);
    }

    return new Types.ObjectId(id);
  }

  private buildDisplayName(
    user: UserDocument,
    profileType: 'user' | 'businessOwner',
  ) {
    if (profileType === 'businessOwner') {
      const profile = getBusinessProfile(user);
      return (
        profile.businessName || profile.ownerName || user.username || 'Business'
      );
    }
    const profile = getPersonalProfile(user);
    return (
      [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
      user.username ||
      user.email
    );
  }

  private async getBusinessOrThrow(businessId: string) {
    const business = await this.userModel.findOne({
      $and: [
        { _id: this.toObjectId(businessId, 'business id') },
        businessOwnerMembershipFilter,
      ],
    });

    if (!business) {
      throw new HttpException('Business not found', 404);
    }

    return business;
  }

  private async getUserOrThrow(userId: string) {
    const user = await this.userModel.findById(
      this.toObjectId(userId, 'user id'),
    );

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    return user;
  }

  private async getReviewOrThrow(reviewId: string) {
    const review = await this.reviewModel.findById(
      this.toObjectId(reviewId, 'review id'),
    );

    if (!review) {
      throw new HttpException('Review not found', 404);
    }

    return review;
  }

  async getBusinessReviewSummary(businessId: string) {
    const businessObjectId = this.toObjectId(businessId, 'business id');
    const summary = await this.reviewModel.aggregate([
      {
        $match: {
          businessId: businessObjectId,
        },
      },
      {
        $group: {
          _id: '$businessId',
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          fiveStar: {
            $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] },
          },
          fourStar: {
            $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] },
          },
          threeStar: {
            $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] },
          },
          twoStar: {
            $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] },
          },
          oneStar: {
            $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] },
          },
        },
      },
    ]);

    const item = summary[0];

    return {
      averageRating: item ? Number(item.averageRating.toFixed(1)) : 0,
      totalReviews: item?.totalReviews ?? 0,
      ratingBreakdown: {
        5: item?.fiveStar ?? 0,
        4: item?.fourStar ?? 0,
        3: item?.threeStar ?? 0,
        2: item?.twoStar ?? 0,
        1: item?.oneStar ?? 0,
      },
    };
  }

  async createReview(reviewerId: string, createReviewDto: CreateReviewDto) {
    const payload = this.normalizePayload(createReviewDto);
    const reviewer = await this.getUserOrThrow(reviewerId);
    const business = await this.getBusinessOrThrow(payload.businessId);

    if (reviewer.id === business.id) {
      throw new HttpException('You cannot review your own business', 400);
    }

    const existingReview = await this.reviewModel.findOne({
      businessId: business._id,
      reviewerId: reviewer._id,
    });

    if (existingReview) {
      throw new HttpException(
        'You have already submitted a review for this business',
        400,
      );
    }

    return this.reviewModel.create({
      businessId: business._id,
      reviewerId: reviewer._id,
      reviewerName: this.buildDisplayName(reviewer, 'user'),
      reviewerAvatar: getPersonalProfile(reviewer).profilePicture,
      businessName: this.buildDisplayName(business, 'businessOwner'),
      rating: payload.rating,
      message: payload.message,
    });
  }

  async getPublicBusinessReviews(
    businessId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    await this.getBusinessOrThrow(businessId);

    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      reviewSearchAbleFields,
      {
        businessId: this.toObjectId(businessId, 'business id'),
      },
    );

    const total = await this.reviewModel.countDocuments(whereConditions);
    const reviews = await this.reviewModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any);

    const summary = await this.getBusinessReviewSummary(businessId);

    return {
      meta: {
        page,
        limit,
        total,
      },
      summary,
      data: reviews,
    };
  }

  async getAllReviews(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      reviewSearchAbleFields,
    );

    const total = await this.reviewModel.countDocuments(whereConditions);
    const reviews = await this.reviewModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any);

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: reviews,
    };
  }

  async getMyReviews(
    reviewerId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      reviewSearchAbleFields,
      {
        reviewerId: this.toObjectId(reviewerId, 'reviewer id'),
      },
    );

    const total = await this.reviewModel.countDocuments(whereConditions);
    const reviews = await this.reviewModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any);

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: reviews,
    };
  }

  async getMyBusinessReviews(
    businessOwnerId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    await this.getBusinessOrThrow(businessOwnerId);

    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      reviewSearchAbleFields,
      {
        businessId: this.toObjectId(businessOwnerId, 'business id'),
      },
    );

    const total = await this.reviewModel.countDocuments(whereConditions);
    const reviews = await this.reviewModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any);

    const summary = await this.getBusinessReviewSummary(businessOwnerId);

    return {
      meta: {
        page,
        limit,
        total,
      },
      summary,
      data: reviews,
    };
  }

  async updateOwnReview(
    reviewId: string,
    reviewerId: string,
    updateReviewDto: UpdateReviewDto,
  ) {
    const review = await this.getReviewOrThrow(reviewId);

    if (review.reviewerId.toString() !== reviewerId) {
      throw new HttpException('You are not allowed to update this review', 403);
    }

    const payload = this.normalizePayload(updateReviewDto);

    const updatedReview = await this.reviewModel.findByIdAndUpdate(
      review._id,
      payload,
      {
        new: true,
        runValidators: true,
      },
    );

    return updatedReview;
  }

  async deleteOwnReview(reviewId: string, reviewerId: string) {
    const review = await this.getReviewOrThrow(reviewId);

    if (review.reviewerId.toString() !== reviewerId) {
      throw new HttpException('You are not allowed to delete this review', 403);
    }

    await this.reviewModel.findByIdAndDelete(review._id);

    return review;
  }

  async replyToReview(
    reviewId: string,
    businessOwnerId: string,
    replyReviewDto: ReplyReviewDto,
  ) {
    const review = await this.getReviewOrThrow(reviewId);

    if (review.businessId.toString() !== businessOwnerId) {
      throw new HttpException(
        'You are not allowed to reply to this review',
        403,
      );
    }

    const businessOwner = await this.getBusinessOrThrow(businessOwnerId);

    const updatedReview = await this.reviewModel.findByIdAndUpdate(
      review._id,
      {
        reply: {
          message: replyReviewDto.message,
          repliedById: businessOwner._id,
          repliedByName: this.buildDisplayName(businessOwner, 'businessOwner'),
          repliedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    return updatedReview;
  }

  async deleteReply(reviewId: string, businessOwnerId: string) {
    const review = await this.getReviewOrThrow(reviewId);

    if (review.businessId.toString() !== businessOwnerId) {
      throw new HttpException('You are not allowed to remove this reply', 403);
    }

    const updatedReview = await this.reviewModel.findByIdAndUpdate(
      review._id,
      {
        $unset: {
          reply: 1,
        },
      },
      {
        new: true,
      },
    );

    return updatedReview;
  }
}
