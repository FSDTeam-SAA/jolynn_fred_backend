import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { fileUpload } from 'src/app/helpers/fileUploder';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import type { IFilterParams } from 'src/app/helpers/pick';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import { Review, ReviewDocument } from '../reviews/entities/review.entity';
import { User, UserDocument } from '../user/entities/user.entity';
import {
  BusinessService,
  BusinessServiceDocument,
} from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

const serviceSearchAbleFields = ['title', 'description'];
const businessOwnerSearchAbleFields = [
  'businessName',
  'category',
  'city',
  'state',
  'country',
];

@Injectable()
export class ServiceService {
  constructor(
    @InjectModel(BusinessService.name)
    private readonly serviceModel: Model<BusinessServiceDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
  ) {}

  private normalizePayload<T extends CreateServiceDto | UpdateServiceDto>(
    payload: T,
  ) {
    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined && value !== ''),
    ) as T;
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private buildContainsRegex(value?: string) {
    if (!value?.trim()) {
      return null;
    }

    return new RegExp(this.escapeRegex(value.trim()), 'i');
  }

  private buildExactRegex(value?: string) {
    if (!value?.trim()) {
      return null;
    }

    return new RegExp(`^${this.escapeRegex(value.trim())}$`, 'i');
  }

  private parseMinimumRating(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const parsedRating = Number(value);

    if (Number.isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
      throw new HttpException('minimumRating must be a number between 0 and 5', 400);
    }

    return parsedRating;
  }

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Invalid service reference', 400);
    }

    return new Types.ObjectId(id);
  }

  private async ensureUniqueTitle(
    ownerId: string,
    title?: string,
    excludeId?: string,
  ) {
    if (!title) {
      return;
    }

    const existingService = await this.serviceModel.findOne({
      ownerId: this.toObjectId(ownerId),
      title,
      ...(excludeId ? { _id: { $ne: this.toObjectId(excludeId) } } : {}),
    });

    if (existingService) {
      throw new HttpException('A service with this title already exists', 400);
    }
  }

  private async getOwnedServiceOrThrow(serviceId: string, ownerId: string) {
    const service = await this.serviceModel.findOne({
      _id: this.toObjectId(serviceId),
      ownerId: this.toObjectId(ownerId),
    });

    if (!service) {
      throw new HttpException('Service not found', 404);
    }

    return service;
  }

  private async getServiceOrThrow(serviceId: string) {
    const service = await this.serviceModel.findById(this.toObjectId(serviceId));

    if (!service) {
      throw new HttpException('Service not found', 404);
    }

    return service;
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

  private buildBusinessOwnerWhereConditions(
    ownerIds: string[],
    params: IFilterParams,
  ) {
    const {
      searchTerm,
      businessName,
      category,
      city,
      state,
      location,
    } = params;

    const andConditions: Record<string, unknown>[] = [
      {
        _id: { $in: ownerIds.map((id) => this.toObjectId(id)) },
        role: 'businessOwner',
        status: 'active',
      },
    ];

    const searchRegex = this.buildContainsRegex(searchTerm);
    if (searchRegex) {
      andConditions.push({
        $or: businessOwnerSearchAbleFields.map((field) => ({
          [field]: { $regex: searchRegex },
        })),
      });
    }

    const businessNameRegex = this.buildExactRegex(businessName);
    if (businessNameRegex) {
      andConditions.push({
        businessName: { $regex: businessNameRegex },
      });
    }

    const categoryRegex = this.buildExactRegex(category);
    if (categoryRegex) {
      andConditions.push({
        category: { $regex: categoryRegex },
      });
    }

    const cityRegex = this.buildExactRegex(city);
    if (cityRegex) {
      andConditions.push({
        city: { $regex: cityRegex },
      });
    }

    const stateRegex = this.buildExactRegex(state);
    if (stateRegex) {
      andConditions.push({
        state: { $regex: stateRegex },
      });
    }

    const locationRegex = this.buildContainsRegex(location);
    if (locationRegex) {
      andConditions.push({
        $or: [
          { city: { $regex: locationRegex } },
          { state: { $regex: locationRegex } },
          { country: { $regex: locationRegex } },
          { address: { $regex: locationRegex } },
          { serviceArea: { $regex: locationRegex } },
        ],
      });
    }

    return andConditions.length > 0 ? { $and: andConditions } : {};
  }

  private buildBusinessOwnerCards(
    businessOwners: UserDocument[],
    servicesByOwnerId: Map<string, BusinessServiceDocument>,
    reviewSummaryMap: Map<string, { averageRating: number; totalReviews: number }>,
  ) {
    return businessOwners.map((owner) => {
      const service = servicesByOwnerId.get(owner.id);
      const reviewSummary = reviewSummaryMap.get(owner.id) ?? {
        averageRating: 0,
        totalReviews: 0,
      };

      return {
        businessOwnerId: owner.id,
        businessName: owner.businessName || owner.username || owner.email,
        category: owner.category,
        city: owner.city,
        state: owner.state,
        country: owner.country,
        address: owner.address,
        serviceArea: owner.serviceArea,
        profilePicture: owner.profilePicture,
        bio: owner.bio,
        businessWebsiteUrl: owner.businessWebsiteUrl,
        phoneNumber: owner.phoneNumber,
        rating: reviewSummary.averageRating,
        totalReviews: reviewSummary.totalReviews,
        createdAt: (owner as any).createdAt,
        service: service
          ? {
              id: service.id,
              title: service.title,
              description: service.description,
              logo: service.logo,
            }
          : null,
      };
    });
  }

  private sortAndPaginateBusinessOwnerCards(
    cards: Array<Record<string, any>>,
    options: IOptions,
  ) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const direction = sortOrder === 'asc' ? 1 : -1;

    const sortedCards = [...cards].sort((left, right) => {
      const leftValue =
        sortBy === 'serviceTitle' ? left.service?.title : left[sortBy];
      const rightValue =
        sortBy === 'serviceTitle' ? right.service?.title : right[sortBy];

      if (leftValue === rightValue) {
        return 0;
      }

      if (leftValue === undefined || leftValue === null) {
        return 1;
      }

      if (rightValue === undefined || rightValue === null) {
        return -1;
      }

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * direction;
      }

      return String(leftValue).localeCompare(String(rightValue)) * direction;
    });

    return {
      meta: {
        page,
        limit,
        total: sortedCards.length,
      },
      data: sortedCards.slice(skip, skip + limit),
    };
  }

  async createService(
    ownerId: string,
    createServiceDto: CreateServiceDto,
    logoFile?: Express.Multer.File,
  ) {
    const payload = this.normalizePayload(createServiceDto);
    await this.ensureUniqueTitle(ownerId, payload.title);

    const servicePayload: Partial<BusinessService> = {
      ownerId: this.toObjectId(ownerId),
      title: payload.title,
      description: payload.description,
    };

    if (logoFile) {
      const uploadedLogo = await fileUpload.uploadToCloudinary(logoFile);
      servicePayload.logo = {
        url: uploadedLogo.url,
        publicId: uploadedLogo.public_id,
      };
    }

    return this.serviceModel.create(servicePayload);
  }

  async getMyServices(ownerId: string, params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(params, serviceSearchAbleFields, {
      ownerId: this.toObjectId(ownerId),
    });

    const total = await this.serviceModel.countDocuments(whereConditions);
    const services = await this.serviceModel
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
      data: services,
    };
  }

  async getOwnServiceById(serviceId: string, ownerId: string) {
    return this.getOwnedServiceOrThrow(serviceId, ownerId);
  }

  async getAllPublicServices(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      serviceSearchAbleFields,
    );

    const total = await this.serviceModel.countDocuments(whereConditions);
    const services = await this.serviceModel
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
      data: services,
    };
  }

  async searchBusinessOwnersByService(
    params: IFilterParams,
    options: IOptions,
  ) {
    const serviceRegex = this.buildContainsRegex(params.service || params.searchTerm);

    if (!serviceRegex) {
      throw new HttpException('Service search keyword is required', 400);
    }

    const matchingServices = await this.serviceModel
      .find({
        $or: [
          { title: { $regex: serviceRegex } },
          { description: { $regex: serviceRegex } },
        ],
      })
      .select('ownerId title description logo createdAt');

    const ownerIds = [
      ...new Set(matchingServices.map((service) => service.ownerId.toString())),
    ];

    if (!ownerIds.length) {
      return this.sortAndPaginateBusinessOwnerCards([], options);
    }

    const whereConditions = this.buildBusinessOwnerWhereConditions(ownerIds, params);
    const businessOwners = await this.userModel.find(whereConditions);
    const servicesByOwnerId = new Map<string, BusinessServiceDocument>();

    for (const service of matchingServices) {
      const ownerId = service.ownerId.toString();
      if (!servicesByOwnerId.has(ownerId)) {
        servicesByOwnerId.set(ownerId, service);
      }
    }

    const reviewSummaryMap = await this.getBusinessReviewSummaries(
      businessOwners.map((owner) => this.toObjectId(owner.id)),
    );
    const minimumRating = this.parseMinimumRating(params.minimumRating ?? params.rating);

    let cards = this.buildBusinessOwnerCards(
      businessOwners,
      servicesByOwnerId,
      reviewSummaryMap,
    );

    if (minimumRating !== null) {
      cards = cards.filter((card) => card.rating >= minimumRating);
    }

    return this.sortAndPaginateBusinessOwnerCards(cards, options);
  }

  async getBusinessOwnersByService(
    serviceId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    const selectedService = await this.getServiceOrThrow(serviceId);

    const matchingServices = await this.serviceModel
      .find({
        title: selectedService.title,
      })
      .select('ownerId title description logo createdAt');

    const ownerIds = [
      ...new Set(matchingServices.map((service) => service.ownerId.toString())),
    ];

    if (!ownerIds.length) {
      return this.sortAndPaginateBusinessOwnerCards([], options);
    }

    const whereConditions = this.buildBusinessOwnerWhereConditions(ownerIds, params);
    const businessOwners = await this.userModel.find(whereConditions);
    const servicesByOwnerId = new Map<string, BusinessServiceDocument>(
      matchingServices.map((service) => [service.ownerId.toString(), service]),
    );
    const reviewSummaryMap = await this.getBusinessReviewSummaries(
      businessOwners.map((owner) => this.toObjectId(owner.id)),
    );
    const minimumRating = this.parseMinimumRating(params.minimumRating ?? params.rating);

    let cards = this.buildBusinessOwnerCards(
      businessOwners,
      servicesByOwnerId,
      reviewSummaryMap,
    );

    if (minimumRating !== null) {
      cards = cards.filter((card) => card.rating >= minimumRating);
    }

    return this.sortAndPaginateBusinessOwnerCards(cards, options);
  }

  async updateOwnService(
    serviceId: string,
    ownerId: string,
    updateServiceDto: UpdateServiceDto,
    logoFile?: Express.Multer.File,
  ) {
    const service = await this.getOwnedServiceOrThrow(serviceId, ownerId);
    const payload = this.normalizePayload(updateServiceDto);

    await this.ensureUniqueTitle(ownerId, payload.title, serviceId);

    if (logoFile) {
      const uploadedLogo = await fileUpload.uploadToCloudinary(logoFile);

      if (service.logo?.publicId) {
        await fileUpload.deleteFromCloudinary(service.logo.publicId);
      }

      payload.logo = {
        url: uploadedLogo.url,
        publicId: uploadedLogo.public_id,
      } as any;
    }

    const updatedService = await this.serviceModel.findByIdAndUpdate(
      service._id,
      payload,
      { new: true, runValidators: true },
    );

    return updatedService;
  }

  async deleteOwnService(serviceId: string, ownerId: string) {
    const service = await this.getOwnedServiceOrThrow(serviceId, ownerId);

    if (service.logo?.publicId) {
      await fileUpload.deleteFromCloudinary(service.logo.publicId);
    }

    await this.serviceModel.findByIdAndDelete(service._id);

    return service;
  }
}
