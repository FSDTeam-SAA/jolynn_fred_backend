import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import { Review, ReviewDocument } from '../reviews/entities/review.entity';
import {
  BusinessService,
  BusinessServiceDocument,
} from '../service/entities/service.entity';
import { User, UserDocument } from '../user/entities/user.entity';
import { CreateSaveQuoteDto } from './dto/create-save-quote.dto';
import { SaveQuote, SaveQuoteDocument } from './entities/save-quote.entity';

@Injectable()
export class SaveQuoteService {
  constructor(
    @InjectModel(SaveQuote.name)
    private readonly saveQuoteModel: Model<SaveQuoteDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(BusinessService.name)
    private readonly serviceModel: Model<BusinessServiceDocument>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
  ) {}

  private toObjectId(id: string, label = 'reference') {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, 400);
    }

    return new Types.ObjectId(id);
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

  private async getBusinessOwnerOrThrow(businessOwnerId: string) {
    const businessOwner = await this.userModel.findOne({
      _id: this.toObjectId(businessOwnerId, 'business owner id'),
      role: 'businessOwner',
      status: 'active',
    });

    if (!businessOwner) {
      throw new HttpException('Business owner not found', 404);
    }

    return businessOwner;
  }

  private async getBusinessReviewSummaries(businessIds: Types.ObjectId[]) {
    if (!businessIds.length) {
      return new Map<string, { averageRating: number; totalReviews: number }>();
    }

    const summaries = await this.reviewModel.aggregate([
      {
        $match: {
          businessId: { $in: businessIds },
        },
      },
      {
        $group: {
          _id: '$businessId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    return new Map(
      summaries.map((item) => [
        item._id.toString(),
        {
          averageRating: Number(item.averageRating.toFixed(1)),
          totalReviews: item.totalReviews,
        },
      ]),
    );
  }

  async saveBusinessman(
    userId: string,
    createSaveQuoteDto: CreateSaveQuoteDto,
  ) {
    const user = await this.getUserOrThrow(userId);
    const businessOwner = await this.getBusinessOwnerOrThrow(
      createSaveQuoteDto.businessOwnerId,
    );

    if (user.id === businessOwner.id) {
      throw new HttpException('You cannot save your own business', 400);
    }

    const existingSavedBusiness = await this.saveQuoteModel.findOne({
      userId: user._id,
      businessOwnerId: businessOwner._id,
    });

    if (existingSavedBusiness) {
      return existingSavedBusiness;
    }

    return this.saveQuoteModel.create({
      userId: user._id,
      businessOwnerId: businessOwner._id,
    });
  }

  async unsaveBusinessman(userId: string, businessOwnerId: string) {
    await this.getUserOrThrow(userId);

    const savedBusiness = await this.saveQuoteModel.findOne({
      userId: this.toObjectId(userId, 'user id'),
      businessOwnerId: this.toObjectId(businessOwnerId, 'business owner id'),
    });

    if (!savedBusiness) {
      throw new HttpException('Saved business owner not found', 404);
    }

    await this.saveQuoteModel.findByIdAndDelete(savedBusiness._id);

    return savedBusiness;
  }

  async getSavedBusinessmen(userId: string, options: IOptions) {
    await this.getUserOrThrow(userId);

    const { limit, page, skip } = paginationHelper(options);

    const savedBusinesses = await this.saveQuoteModel
      .find({
        userId: this.toObjectId(userId, 'user id'),
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await this.saveQuoteModel.countDocuments({
      userId: this.toObjectId(userId, 'user id'),
    });

    const businessOwnerIds = savedBusinesses.map(
      (item) => item.businessOwnerId,
    );

    const [businessOwners, businessServices, reviewSummaryMap] =
      await Promise.all([
        this.userModel
          .find({
            _id: { $in: businessOwnerIds },
            role: 'businessOwner',
            status: 'active',
          })
          .lean(),
        this.serviceModel
          .find({
            ownerId: { $in: businessOwnerIds },
          })
          .sort({ createdAt: -1 })
          .lean(),
        this.getBusinessReviewSummaries(businessOwnerIds as Types.ObjectId[]),
      ]);

    const businessOwnerMap = new Map(
      businessOwners.map((businessOwner) => [
        businessOwner._id.toString(),
        businessOwner,
      ]),
    );

    const serviceMap = new Map<string, any>();
    for (const service of businessServices) {
      const ownerId = service.ownerId.toString();
      if (!serviceMap.has(ownerId)) {
        serviceMap.set(ownerId, service);
      }
    }

    const data = savedBusinesses
      .map((savedBusiness) => {
        const ownerId = savedBusiness.businessOwnerId.toString();
        const businessOwner = businessOwnerMap.get(ownerId);

        if (!businessOwner) {
          return null;
        }

        const service = serviceMap.get(ownerId);
        const reviewSummary = reviewSummaryMap.get(ownerId) ?? {
          averageRating: 0,
          totalReviews: 0,
        };

        return {
          id: savedBusiness._id.toString(),
          savedAt: (savedBusiness as any).createdAt,
          businessOwner: {
            businessOwnerId: ownerId,
            businessName:
              businessOwner.businessName ||
              businessOwner.username ||
              businessOwner.email,
            category: businessOwner.category,
            city: businessOwner.city,
            state: businessOwner.state,
            country: businessOwner.country,
            address: businessOwner.address,
            serviceArea: businessOwner.serviceArea,
            profilePicture: businessOwner.profilePicture,
            bio: businessOwner.bio,
            businessWebsiteUrl: businessOwner.businessWebsiteUrl,
            phoneNumber: businessOwner.phoneNumber,
            rating: reviewSummary.averageRating,
            totalReviews: reviewSummary.totalReviews,
            service: service
              ? {
                  id: service._id.toString(),
                  title: service.title,
                  description: service.description,
                  logo: service.logo,
                }
              : null,
          },
        };
      })
      .filter(Boolean);

    return {
      meta: {
        page,
        limit,
        total,
      },
      data,
    };
  }
}
