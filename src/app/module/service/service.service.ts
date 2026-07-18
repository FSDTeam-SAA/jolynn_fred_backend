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
      Object.entries(payload).filter(
        ([, value]) => value !== undefined && value !== '',
      ),
    ) as T;
  }

  private toObjectId(id: string, label = 'service reference') {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, 400);
    }

    return new Types.ObjectId(id);
  }

  private async ensurePublicBusinessOwnerExists(ownerId: string) {
    const owner = await this.userModel.exists({
      _id: this.toObjectId(ownerId, 'business owner id'),
      role: 'businessOwner',
      status: 'active',
    });

    if (!owner) {
      throw new HttpException('Business owner not found', 404);
    }
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
      ownerId: this.toObjectId(ownerId, 'business owner id'),
      title,
      ...(excludeId
        ? { _id: { $ne: this.toObjectId(excludeId, 'service id') } }
        : {}),
    });

    if (existingService) {
      throw new HttpException('A service with this title already exists', 400);
    }
  }

  private async getOwnedServiceOrThrow(serviceId: string, ownerId: string) {
    const service = await this.serviceModel.findOne({
      _id: this.toObjectId(serviceId, 'service id'),
      ownerId: this.toObjectId(ownerId, 'business owner id'),
    });

    if (!service) {
      throw new HttpException('Service not found', 404);
    }

    return service;
  }

  private async getServiceOrThrow(serviceId: string) {
    const service = await this.serviceModel.findById(
      this.toObjectId(serviceId, 'service id'),
    );

    if (!service) {
      throw new HttpException('Service not found', 404);
    }

    return service;
  }

  private async getServicesByOwner(
    ownerId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      serviceSearchAbleFields,
      {
        ownerId: this.toObjectId(ownerId, 'business owner id'),
      },
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

  async createService(
    ownerId: string,
    createServiceDto: CreateServiceDto,
    logoFile?: Express.Multer.File,
  ) {
    const payload = this.normalizePayload(createServiceDto);
    await this.ensureUniqueTitle(ownerId, payload.title);

    const servicePayload: Partial<BusinessService> = {
      ownerId: this.toObjectId(ownerId, 'business owner id'),
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

  async getMyServices(
    ownerId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    return this.getServicesByOwner(ownerId, params, options);
  }

  async getOwnServiceById(serviceId: string, ownerId: string) {
    return this.getOwnedServiceOrThrow(serviceId, ownerId);
  }

  async getPublicServicesByOwner(
    ownerId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    await this.ensurePublicBusinessOwnerExists(ownerId);

    return this.getServicesByOwner(ownerId, params, options);
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

  async getBusinessOwnersByService(
    serviceId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    const selectedService = await this.getServiceOrThrow(serviceId);
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);

    const matchingServices = await this.serviceModel
      .find({
        title: selectedService.title,
      })
      .select('ownerId title description logo createdAt');

    const ownerIds = [
      ...new Set(matchingServices.map((service) => service.ownerId.toString())),
    ];

    if (!ownerIds.length) {
      return {
        meta: {
          page,
          limit,
          total: 0,
        },
        data: [],
      };
    }

    const whereConditions = buildWhereConditions(
      params,
      businessOwnerSearchAbleFields,
      {
        _id: {
          $in: ownerIds.map((id) => this.toObjectId(id, 'business owner id')),
        },
        role: 'businessOwner',
        status: 'active',
      },
    );

    const total = await this.userModel.countDocuments(whereConditions);
    const businessOwners = await this.userModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any);

    const servicesByOwnerId = new Map(
      matchingServices.map((service) => [service.ownerId.toString(), service]),
    );
    const reviewSummaryMap = await this.getBusinessReviewSummaries(
      businessOwners.map((owner) =>
        this.toObjectId(owner.id, 'business owner id'),
      ),
    );

    const cards = businessOwners.map((owner) => {
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
        profilePicture: owner.profilePicture,
        bio: owner.bio,
        businessWebsiteUrl: owner.businessWebsiteUrl,
        phoneNumber: owner.phoneNumber,
        rating: reviewSummary.averageRating,
        totalReviews: reviewSummary.totalReviews,
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

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: cards,
    };
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
