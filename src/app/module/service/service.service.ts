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
import { ServiceCategoryService } from '../service-category/service-category.service';
import { ServiceCategory } from '../service-category/entities/service-category.entity';
import sendMailer from 'src/app/helpers/sendMailer';
import { createNotificationEmailTemplate } from 'src/app/helpers/template';
import config from 'src/app/config';
import {
  activeBusinessOwnerFilter,
  getBusinessProfile,
  hasProfileRole,
} from 'src/app/helpers/account-profile';

const serviceSearchAbleFields = ['title', 'description', 'keywords'];
const businessOwnerSearchAbleFields = [
  'email',
  'username',
  'businessProfile.ownerName',
  'businessProfile.phoneNumber',
  'businessProfile.businessName',
  'businessProfile.businessEmail',
  'businessProfile.businessWebsiteUrl',
  'businessProfile.serviceArea',
  'businessProfile.category',
  'businessProfile.city',
  'businessProfile.state',
  'businessProfile.country',
  'businessProfile.address',
  'businessProfile.postcode',
  'businessProfile.bio',
  // Legacy paths remain searchable until existing accounts are migrated.
  'businessName',
  'category',
  'city',
  'state',
];

const serviceGlobalSearchableFields = ['title', 'description', 'keywords'];

const serviceCategorySearchableFields = [
  'name',
  'slug',
  'normalizedName',
  'description',
  'keywords',
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
    @InjectModel(ServiceCategory.name)
    private readonly serviceCategoryModel: Model<ServiceCategory>,
    private readonly serviceCategoryService: ServiceCategoryService,
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

  private normalizeKeywords(keywords?: string[]) {
    if (!keywords?.length) {
      return [];
    }

    return [
      ...new Set(
        keywords
          .map((keyword) => keyword.trim().replace(/\s+/g, ' ').toLowerCase())
          .filter(Boolean),
      ),
    ];
  }

  private parseMinimumRating(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const parsedRating = Number(value);

    if (Number.isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
      throw new HttpException(
        'minimumRating must be a number between 0 and 5',
        400,
      );
    }

    return parsedRating;
  }

  private toObjectId(id: string, label = 'service reference') {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, 400);
    }

    return new Types.ObjectId(id);
  }

  private buildDisplayName(user: UserDocument) {
    const profile = getBusinessProfile(user);
    return (
      profile.businessName || profile.ownerName || user.username || 'Business'
    );
  }

  private async ensurePublicBusinessOwnerExists(ownerId: string) {
    const owner = await this.userModel
      .findById(this.toObjectId(ownerId, 'business owner id'))
      .select('role roles status businessProfile');

    if (!owner) {
      throw new HttpException('Business owner not found', 404);
    }

    if (!hasProfileRole(owner, 'businessOwner')) {
      throw new HttpException('Business owner not found', 404);
    }

    if (getBusinessProfile(owner).status !== 'active') {
      throw new HttpException('Business owner is not active', 404);
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
    publicOnly = false,
  ) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const approvedCategoryIds = publicOnly
      ? await this.serviceCategoryModel
          .find({ status: 'approved', isActive: true })
          .distinct('_id')
      : [];
    const whereConditions = buildWhereConditions(
      params,
      serviceSearchAbleFields,
      {
        ownerId: this.toObjectId(ownerId, 'business owner id'),
        ...(publicOnly
          ? {
              status: 'active',
              serviceCategoryId: { $in: approvedCategoryIds },
            }
          : {}),
      },
    );

    const total = await this.serviceModel.countDocuments(whereConditions);
    const services = await this.serviceModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any)
      .lean();

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: services.map((service) => ({
        ...service,
        viewCount: service.viewCount ?? 0,
      })),
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

  private buildBusinessOwnerWhereConditions(
    ownerIds: string[] | null,
    params: IFilterParams,
    searchableCategoryIds: Types.ObjectId[] = [],
  ) {
    const {
      searchTerm,
      businessName,
      category,
      city,
      state,
      zipcode,
      location,
    } = params;

    const andConditions: Record<string, unknown>[] = [
      activeBusinessOwnerFilter,
    ];

    if (ownerIds) {
      andConditions.push({
        _id: {
          $in: ownerIds.map((id) => this.toObjectId(id, 'business owner id')),
        },
      });
    }

    const searchRegex = this.buildContainsRegex(searchTerm);
    if (searchRegex) {
      const profileSearchConditions = businessOwnerSearchAbleFields.map(
        (field) => ({
          [field]: { $regex: searchRegex },
        }),
      );

      if (searchableCategoryIds.length) {
        profileSearchConditions.push({
          'businessProfile.serviceCategoryId': {
            $in: searchableCategoryIds,
          },
        } as any);
      }

      andConditions.push({ $or: profileSearchConditions });
    }

    const businessNameRegex = this.buildExactRegex(businessName);
    if (businessNameRegex) {
      andConditions.push({
        $or: [
          { 'businessProfile.businessName': { $regex: businessNameRegex } },
          { businessName: { $regex: businessNameRegex } },
        ],
      });
    }

    const categoryRegex = this.buildExactRegex(category);
    if (categoryRegex) {
      andConditions.push({
        $or: [
          { 'businessProfile.category': { $regex: categoryRegex } },
          { category: { $regex: categoryRegex } },
        ],
      });
    }

    const cityRegex = this.buildExactRegex(city);
    if (cityRegex) {
      andConditions.push({ 'businessProfile.city': { $regex: cityRegex } });
    }

    const stateRegex = this.buildExactRegex(state);
    if (stateRegex) {
      andConditions.push({ 'businessProfile.state': { $regex: stateRegex } });
    }

    const zipcodeRegex = this.buildExactRegex(zipcode);
    if (zipcodeRegex) {
      andConditions.push({
        'businessProfile.postcode': { $regex: zipcodeRegex },
      });
    }

    const locationRegex = this.buildContainsRegex(location);
    if (locationRegex) {
      andConditions.push({
        $or: [
          { 'businessProfile.city': { $regex: locationRegex } },
          { 'businessProfile.state': { $regex: locationRegex } },
          { 'businessProfile.country': { $regex: locationRegex } },
          { 'businessProfile.address': { $regex: locationRegex } },
          { 'businessProfile.serviceArea': { $regex: locationRegex } },
        ],
      });
    }

    return andConditions.length > 0 ? { $and: andConditions } : {};
  }

  private buildBusinessOwnerCards(
    businessOwners: UserDocument[],
    servicesByOwnerId: Map<string, BusinessServiceDocument>,
    reviewSummaryMap: Map<
      string,
      { averageRating: number; totalReviews: number }
    >,
  ) {
    return businessOwners.map((owner) => {
      const profile = getBusinessProfile(owner);
      const service = servicesByOwnerId.get(owner.id);
      const reviewSummary = reviewSummaryMap.get(owner.id) ?? {
        averageRating: 0,
        totalReviews: 0,
      };

      return {
        businessOwnerId: owner.id,
        businessName: profile.businessName || owner.username || 'Business',
        email: profile.businessEmail,
        businessEmail: profile.businessEmail,
        category: profile.category,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        address: profile.address,
        serviceArea: profile.serviceArea,
        profilePicture: profile.profilePicture,
        bio: profile.bio,
        businessWebsiteUrl: profile.businessWebsiteUrl,
        phoneNumber: profile.phoneNumber,
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
    const serviceCategory =
      await this.serviceCategoryService.resolveCategorySelection(
        payload.title,
        payload.requestedCategory,
        'service_creation',
        ownerId,
      );
    const isPendingCategory = serviceCategory.status === 'pending';
    const isOtherCategory =
      isPendingCategory &&
      ['other', 'others', '__other__'].includes(
        payload.title.trim().replace(/\s+/g, ' ').toLowerCase(),
      );
    const title = isOtherCategory ? payload.title : serviceCategory.name;

    await this.ensureUniqueTitle(ownerId, title);

    const servicePayload: Partial<BusinessService> = {
      ownerId: this.toObjectId(ownerId, 'business owner id'),
      title,
      serviceCategoryId: serviceCategory._id,
      requestedCategory: isOtherCategory ? payload.requestedCategory : null,
      keywords: this.normalizeKeywords(payload.keywords),
      status: isPendingCategory ? 'pending' : 'active',
      description: payload.description,
    };

    if (logoFile) {
      const uploadedLogo = await fileUpload.uploadToCloudinary(logoFile);
      servicePayload.logo = {
        url: uploadedLogo.url,
        publicId: uploadedLogo.public_id,
      };
    }

    if (isOtherCategory && isPendingCategory && config.email.admin) {
      sendMailer(
        config.email.admin,
        'Service Category Approval Required',
        createNotificationEmailTemplate({
          heading: 'Service Category Approval Needed',
          subheading: 'A new service is waiting for category approval.',
          introText:
            'A business owner added a service using a new category. Please review and approve the requested category before publishing this service on the platform.',
          details: [
            { label: 'Requested Category', value: payload.requestedCategory! },
            { label: 'Service Owner', value: ownerId },
            { label: 'Service Description', value: payload.description },
          ],
          noteTitle: 'Action required',
          noteText:
            'Approve or reject the requested category from the admin dashboard.',
        }),
      ).catch((error) =>
        console.error('Failed to send service category approval email:', error),
      );
    }

    return this.serviceModel.create(servicePayload);
  }

  async getMyServices(
    ownerId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    return this.getServicesByOwner(ownerId, params, options, true);
  }

  async getOwnServiceById(serviceId: string, ownerId: string) {
    return this.getOwnedServiceOrThrow(serviceId, ownerId);
  }

  async recordPublicServiceView(serviceId: string) {
    if (!Types.ObjectId.isValid(serviceId)) {
      throw new HttpException('Service not found', 404);
    }

    const service = await this.serviceModel
      .findByIdAndUpdate(serviceId, { $inc: { viewCount: 1 } }, { new: true })
      .select('_id viewCount')
      .lean();

    if (!service) {
      throw new HttpException('Service not found', 404);
    }

    return {
      _id: service._id,
      viewCount: service.viewCount ?? 0,
    };
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
    const approvedCategoryIds = await this.serviceCategoryModel
      .find({ status: 'approved', isActive: true })
      .distinct('_id');
    const whereConditions = buildWhereConditions(
      params,
      serviceSearchAbleFields,
      { status: 'active', serviceCategoryId: { $in: approvedCategoryIds } },
    );

    const total = await this.serviceModel.countDocuments(whereConditions);
    const services = await this.serviceModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any)
      .lean();

    const ownerIds = services.map((service) => service.ownerId);
    const owners = await this.userModel
      .find({
        _id: { $in: ownerIds },
      })
      .select(
        'businessName username email city state country address serviceArea businessProfile',
      );

    const ownerMap = new Map(
      owners.map((owner) => [owner._id.toString(), owner]),
    );

    const data = services.map((service) => {
      const owner = ownerMap.get(service.ownerId.toString());
      const profile = owner ? getBusinessProfile(owner) : null;

      return {
        ...service,
        viewCount: service.viewCount ?? 0,
        businessOwnerName: owner ? this.buildDisplayName(owner) : null,
        businessOwnerLocation: owner
          ? {
              city: profile?.city,
              state: profile?.state,
              country: profile?.country,
              address: profile?.address,
              serviceArea: profile?.serviceArea,
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
      data,
    };
  }

  async searchBusinessOwnersByService(
    params: IFilterParams,
    options: IOptions,
  ) {
    const globalSearchRegex = this.buildContainsRegex(params.searchTerm);
    const serviceRegex = this.buildContainsRegex(params.service);
    const approvedCategoryIds = await this.serviceCategoryModel
      .find({ status: 'approved', isActive: true })
      .distinct('_id');

    const findMatchingCategoryIds = (searchRegex: RegExp | null) =>
      searchRegex
        ? this.serviceCategoryModel
            .find({
              status: 'approved',
              isActive: true,
              $or: serviceCategorySearchableFields.map((field) => ({
                [field]: { $regex: searchRegex },
              })),
            })
            .distinct('_id')
        : Promise.resolve([]);

    const [serviceCategoryIds, globalCategoryIds] = await Promise.all([
      findMatchingCategoryIds(serviceRegex),
      findMatchingCategoryIds(globalSearchRegex),
    ]);

    const findMatchingServices = (
      searchRegex: RegExp | null,
      matchingCategoryIds: Types.ObjectId[],
    ) =>
      searchRegex
        ? this.serviceModel
            .find({
              status: 'active',
              serviceCategoryId: { $in: approvedCategoryIds },
              $or: [
                ...serviceGlobalSearchableFields.map((field) => ({
                  [field]: { $regex: searchRegex },
                })),
                ...(matchingCategoryIds.length
                  ? [{ serviceCategoryId: { $in: matchingCategoryIds } }]
                  : []),
              ],
            })
            .sort({ createdAt: -1 })
            .select('ownerId title description logo createdAt')
        : Promise.resolve([] as BusinessServiceDocument[]);

    const [serviceMatchingServices, globalMatchingServices] = await Promise.all(
      [
        findMatchingServices(serviceRegex, serviceCategoryIds),
        findMatchingServices(globalSearchRegex, globalCategoryIds),
      ],
    );

    const serviceOwnerIds = serviceRegex
      ? [
          ...new Set(
            serviceMatchingServices.map((service) =>
              service.ownerId.toString(),
            ),
          ),
        ]
      : null;

    const matchingProfileOwners = globalSearchRegex
      ? await this.userModel
          .find({
            $and: [
              activeBusinessOwnerFilter,
              {
                $or: [
                  ...businessOwnerSearchAbleFields.map((field) => ({
                    [field]: { $regex: globalSearchRegex },
                  })),
                  ...(globalCategoryIds.length
                    ? [
                        {
                          'businessProfile.serviceCategoryId': {
                            $in: globalCategoryIds,
                          },
                        },
                        { serviceCategoryId: { $in: globalCategoryIds } },
                      ]
                    : []),
                ],
              },
            ],
          })
          .select('_id')
      : [];

    const globalOwnerIds = globalSearchRegex
      ? [
          ...new Set([
            ...globalMatchingServices.map((service) =>
              service.ownerId.toString(),
            ),
            ...matchingProfileOwners.map((owner) => owner.id),
          ]),
        ]
      : null;

    let ownerIds: string[] | null = null;
    if (serviceOwnerIds && globalOwnerIds) {
      const globalOwnerIdSet = new Set(globalOwnerIds);
      ownerIds = serviceOwnerIds.filter((id) => globalOwnerIdSet.has(id));
    } else {
      ownerIds = serviceOwnerIds || globalOwnerIds;
    }

    if ((serviceRegex || globalSearchRegex) && !ownerIds?.length) {
      return this.sortAndPaginateBusinessOwnerCards([], options);
    }

    // The owner ids already represent the OR across service, category, and
    // profile matches. Reapplying searchTerm here would incorrectly require a
    // matching service owner to also contain the term in their profile.
    const whereConditions = this.buildBusinessOwnerWhereConditions(ownerIds, {
      ...params,
      searchTerm: undefined,
    });
    const businessOwners = await this.userModel.find(whereConditions);
    const servicesByOwnerId = new Map<string, BusinessServiceDocument>();
    const servicesForCards = serviceRegex
      ? serviceMatchingServices
      : globalSearchRegex
        ? globalMatchingServices
        : await this.serviceModel
            .find({
              status: 'active',
              serviceCategoryId: { $in: approvedCategoryIds },
              ownerId: {
                $in: businessOwners.map((owner) =>
                  this.toObjectId(owner.id, 'business owner id'),
                ),
              },
            })
            .sort({ createdAt: -1 })
            .select('ownerId title description logo createdAt');

    for (const service of servicesForCards) {
      const ownerId = service.ownerId.toString();
      if (!servicesByOwnerId.has(ownerId)) {
        servicesByOwnerId.set(ownerId, service);
      }
    }

    const reviewSummaryMap = await this.getBusinessReviewSummaries(
      businessOwners.map((owner) => this.toObjectId(owner.id)),
    );
    const minimumRating = this.parseMinimumRating(
      params.minimumRating ?? params.rating,
    );

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
        status: 'active',
      })
      .select('ownerId title description logo createdAt');

    const ownerIds = [
      ...new Set(matchingServices.map((service) => service.ownerId.toString())),
    ];

    if (!ownerIds.length) {
      return this.sortAndPaginateBusinessOwnerCards([], options);
    }

    const whereConditions = this.buildBusinessOwnerWhereConditions(
      ownerIds,
      params,
    );
    const businessOwners = await this.userModel.find(whereConditions);
    const servicesByOwnerId = new Map<string, BusinessServiceDocument>(
      matchingServices.map((service) => [service.ownerId.toString(), service]),
    );
    const reviewSummaryMap = await this.getBusinessReviewSummaries(
      businessOwners.map((owner) =>
        this.toObjectId(owner.id, 'business owner id'),
      ),
    );
    const minimumRating = this.parseMinimumRating(
      params.minimumRating ?? params.rating,
    );

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
    const payload = this.normalizePayload(
      updateServiceDto,
    ) as UpdateServiceDto & {
      serviceCategoryId?: Types.ObjectId;
    };

    if (payload.title) {
      const serviceCategory =
        await this.serviceCategoryService.resolveCategorySelection(
          payload.title,
          payload.requestedCategory,
          'service_creation',
          ownerId,
        );

      payload.title = serviceCategory.name;
      payload.serviceCategoryId = serviceCategory._id;
    }

    delete payload.requestedCategory;

    if (payload.keywords !== undefined) {
      payload.keywords = this.normalizeKeywords(payload.keywords);
    }

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
