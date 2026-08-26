import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import { fileUpload } from 'src/app/helpers/fileUploder';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import { IFilterParams } from 'src/app/helpers/pick';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import {
  ServiceCategory,
  ServiceCategorySource,
} from './entities/service-category.entity';
import { BusinessService } from '../service/entities/service.entity';
import {
  HelpWanted,
  HelpWantedDocument,
} from '../help-wanted/entities/help-wanted.entity';
import { User, UserDocument } from '../user/entities/user.entity';
import sendMailer from 'src/app/helpers/sendMailer';
import { createBusinessCategoryApprovedEmailTemplate } from 'src/app/helpers/template';
import {
  businessOwnerMembershipFilter,
  getBusinessProfile,
} from 'src/app/helpers/account-profile';

const serviceCategorySearchAbleFields = [
  'name',
  'slug',
  'normalizedName',
  'description',
  'keywords',
  'status',
  'source',
];

const publicServiceCategorySearchableFields = [
  'name',
  'slug',
  'normalizedName',
  'description',
  'keywords',
];

type CategorySelectionSource = Extract<
  ServiceCategorySource,
  'help_wanted' | 'business_registration' | 'service_creation'
>;

@Injectable()
export class ServiceCategoryService {
  constructor(
    @InjectModel(ServiceCategory.name)
    private readonly serviceCategoryModel: Model<ServiceCategory>,
    @InjectModel(BusinessService.name)
    private readonly businessServiceModel: Model<BusinessService>,
    @InjectModel(HelpWanted.name)
    private readonly helpWantedModel: Model<HelpWantedDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private normalizeCategoryName(name: string) {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private toDisplayName(name: string) {
    return name.trim().replace(/\s+/g, ' ');
  }

  private normalizeKeywords(keywords?: string[]) {
    if (!keywords?.length) {
      return [];
    }

    return [
      ...new Set(
        keywords
          .map((keyword) => this.normalizeCategoryName(keyword))
          .filter(Boolean),
      ),
    ];
  }

  private createSlug(name: string) {
    const slug = this.normalizeCategoryName(name)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || 'category';
  }

  private async createUniqueSlug(name: string, excludeId?: string) {
    const baseSlug = this.createSlug(name);
    let slug = baseSlug;
    let counter = 2;

    while (
      await this.serviceCategoryModel.exists({
        slug,
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return slug;
  }

  private toObjectId(id?: string) {
    if (!id) {
      return undefined;
    }

    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Invalid user id', 400);
    }

    return new Types.ObjectId(id);
  }

  private parseFilters(params: IFilterParams) {
    const filters = { ...params };

    if (filters.isActive !== undefined) {
      filters.isActive =
        filters.isActive === true || filters.isActive === 'true';
    }

    return filters;
  }

  private isOtherCategory(category: string) {
    return ['other', 'others', '__other__'].includes(
      this.normalizeCategoryName(category),
    );
  }

  private async findByNormalizedName(name: string) {
    return this.serviceCategoryModel.findOne({
      normalizedName: this.normalizeCategoryName(name),
    });
  }

  private notifyBusinessOwnersCategoryApproved(
    businessOwners: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      businessName?: string;
      businessProfile?: {
        ownerName?: string;
        businessName?: string;
      };
    }>,
    categoryName: string,
  ) {
    for (const businessOwner of businessOwners) {
      const profile = getBusinessProfile(businessOwner as any);
      const displayName = profile.ownerName || profile.businessName || 'there';

      void sendMailer(
        businessOwner.email,
        'Your business is ready on SideQuote',
        createBusinessCategoryApprovedEmailTemplate({
          displayName,
          businessName: profile.businessName,
          categoryName,
        }),
      ).catch((error) => {
        console.error(
          'Failed to send business category approval email:',
          error,
        );
      });
    }
  }

  private async ensureNoPendingCategoryRequest(requestedByUserId?: string) {
    const userId = this.toObjectId(requestedByUserId);
    if (!userId) {
      return;
    }

    const [pendingBusinessOwner, pendingService] = await Promise.all([
      this.userModel
        .findOne({
          $and: [
            { _id: userId },
            businessOwnerMembershipFilter,
            {
              $or: [
                {
                  'businessProfile.status': 'pending',
                  'businessProfile.requestedCategory': { $nin: [null, ''] },
                },
                {
                  businessProfile: { $exists: false },
                  status: 'pending',
                  requestedCategory: { $nin: [null, ''] },
                },
              ],
            },
          ],
        })
        .select('requestedCategory businessProfile.requestedCategory'),
      this.businessServiceModel
        .findOne({
          ownerId: userId,
          status: 'pending',
          requestedCategory: { $nin: [null, ''] },
        })
        .select('requestedCategory'),
    ]);

    const pendingCategory =
      (pendingBusinessOwner
        ? getBusinessProfile(pendingBusinessOwner).requestedCategory
        : undefined) ?? pendingService?.requestedCategory;

    if (pendingCategory) {
      throw new HttpException(
        `Your category request "${pendingCategory}" is currently subject to admin review. Please wait for a decision before requesting another new category.`,
        409,
      );
    }
  }

  async createServiceCategory(
    createServiceCategoryDto: CreateServiceCategoryDto,
    adminId?: string,
    logoFile?: Express.Multer.File,
  ) {
    const name = this.toDisplayName(createServiceCategoryDto.name);
    const normalizedName = this.normalizeCategoryName(name);
    const existingCategory = await this.findByNormalizedName(name);

    if (existingCategory) {
      throw new HttpException('Service category already exists', 400);
    }

    const payload: Record<string, unknown> = {
      ...createServiceCategoryDto,
      name,
      normalizedName,
      slug: await this.createUniqueSlug(name),
      status: 'approved',
      source: 'admin',
      approvedByAdminId: this.toObjectId(adminId),
      approvedAt: new Date(),
      isActive: createServiceCategoryDto.isActive ?? true,
      sortOrder: createServiceCategoryDto.sortOrder ?? 0,
      keywords: this.normalizeKeywords(createServiceCategoryDto.keywords),
    };
    delete payload.logo;

    let uploadedLogo: { url: string; public_id: string } | undefined;

    try {
      if (logoFile) {
        uploadedLogo = await fileUpload.uploadToCloudinary(logoFile);
        payload.logo = {
          url: uploadedLogo.url,
          publicId: uploadedLogo.public_id,
        };
      }

      return await this.serviceCategoryModel.create(payload);
    } catch (error) {
      if (uploadedLogo?.public_id) {
        await fileUpload.deleteFromCloudinary(uploadedLogo.public_id);
      }

      if ((error as { code?: number }).code === 11000) {
        throw new HttpException('Service category already exists', 400);
      }

      throw error;
    }
  }

  async requestServiceCategory(
    name: string,
    source: CategorySelectionSource,
    requestedByUserId?: string,
  ) {
    const displayName = this.toDisplayName(name);

    if (!displayName) {
      throw new HttpException('Requested category name is required', 400);
    }

    const existingCategory = await this.findByNormalizedName(displayName);

    if (existingCategory) {
      return existingCategory;
    }

    await this.ensureNoPendingCategoryRequest(requestedByUserId);

    try {
      return await this.serviceCategoryModel.create({
        name: displayName,
        normalizedName: this.normalizeCategoryName(displayName),
        slug: await this.createUniqueSlug(displayName),
        status: 'pending',
        source,
        requestedByUserId: this.toObjectId(requestedByUserId),
        isActive: true,
        sortOrder: 0,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        const existing = await this.findByNormalizedName(displayName);

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  async resolveCategorySelection(
    category: string,
    requestedCategory: string | undefined,
    source: CategorySelectionSource,
    requestedByUserId?: string,
  ) {
    if (this.isOtherCategory(category)) {
      if (!requestedCategory) {
        throw new HttpException(
          'Requested category is required when category is Other',
          400,
        );
      }

      return this.requestServiceCategory(
        requestedCategory,
        source,
        requestedByUserId,
      );
    }

    const existingCategory = await this.findByNormalizedName(category);

    if (
      !existingCategory ||
      existingCategory.status !== 'approved' ||
      !existingCategory.isActive
    ) {
      throw new HttpException(
        'Please select an approved service category or choose Other',
        400,
      );
    }

    return existingCategory;
  }

  async getAllServiceCategories(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      this.parseFilters(params),
      serviceCategorySearchAbleFields,
    );

    const total =
      await this.serviceCategoryModel.countDocuments(whereConditions);
    const categories = await this.serviceCategoryModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any)
      .lean();

    const categoryIds = categories.map((category) => category._id);
    const ownerCounts = categoryIds.length
      ? await this.businessServiceModel.aggregate<{
          _id: Types.ObjectId;
          businessOwnerCount: number;
        }>([
          {
            $match: {
              serviceCategoryId: { $in: categoryIds },
            },
          },
          {
            $group: {
              _id: {
                serviceCategoryId: '$serviceCategoryId',
                ownerId: '$ownerId',
              },
            },
          },
          {
            $group: {
              _id: '$_id.serviceCategoryId',
              businessOwnerCount: { $sum: 1 },
            },
          },
        ])
      : [];
    const ownerCountByCategoryId = new Map(
      ownerCounts.map((item) => [item._id.toString(), item.businessOwnerCount]),
    );

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: categories.map((category) => ({
        ...category,
        businessOwnerCount:
          ownerCountByCategoryId.get(category._id.toString()) ?? 0,
      })),
    };
  }

   async getPublicServiceCategories(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper({
      limit: 50,
      sortBy: 'viewCount',
      sortOrder: 'desc',
      ...options,
    });
    const whereConditions = buildWhereConditions(
      params,
      publicServiceCategorySearchableFields,
      {
        status: 'approved',
        isActive: true,
      },
    );

    const total =
      await this.serviceCategoryModel.countDocuments(whereConditions);
    const categories = await this.serviceCategoryModel
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
      data: categories.map((category) => ({
        ...category,
        viewCount: category.viewCount ?? 0,
      })),
    };
  }

  async recordPublicServiceCategoryView(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Service category not found', 404);
    }

    const category = await this.serviceCategoryModel
      .findOneAndUpdate(
        {
          _id: id,
          status: 'approved',
          isActive: true,
        },
        { $inc: { viewCount: 1 } },
        { new: true },
      )
      .select('_id viewCount')
      .lean();

    if (!category) {
      throw new HttpException('Service category not found', 404);
    }

    return {
      _id: category._id,
      viewCount: category.viewCount ?? 0,
    };
  }

  async getSingleServiceCategory(id: string) {
    const category = await this.serviceCategoryModel.findById(id);

    if (!category) {
      throw new HttpException('Service category not found', 404);
    }

    return category;
  }

  async updateServiceCategory(
    id: string,
    updateServiceCategoryDto: UpdateServiceCategoryDto,
    logoFile?: Express.Multer.File,
  ) {
    const category = await this.getSingleServiceCategory(id);
    const updatePayload: Record<string, unknown> = {
      ...updateServiceCategoryDto,
    };
    delete updatePayload.logo;

    if (updateServiceCategoryDto.keywords !== undefined) {
      updatePayload.keywords = this.normalizeKeywords(
        updateServiceCategoryDto.keywords,
      );
    }

    if (updateServiceCategoryDto.name) {
      const name = this.toDisplayName(updateServiceCategoryDto.name);
      const normalizedName = this.normalizeCategoryName(name);
      const duplicateCategory = await this.serviceCategoryModel.findOne({
        normalizedName,
        _id: { $ne: id },
      });

      if (duplicateCategory) {
        throw new HttpException('Service category already exists', 400);
      }

      updatePayload.name = name;
      updatePayload.normalizedName = normalizedName;
      updatePayload.slug = await this.createUniqueSlug(name, id);
    }

    let uploadedLogo: { url: string; public_id: string } | undefined;

    try {
      if (logoFile) {
        uploadedLogo = await fileUpload.uploadToCloudinary(logoFile);
        updatePayload.logo = {
          url: uploadedLogo.url,
          publicId: uploadedLogo.public_id,
        };
      }

      const updatedCategory = await this.serviceCategoryModel.findByIdAndUpdate(
        category.id,
        updatePayload,
        { new: true, runValidators: true },
      );

      if (uploadedLogo && category.logo?.publicId) {
        await fileUpload.deleteFromCloudinary(category.logo.publicId);
      }

      return updatedCategory;
    } catch (error) {
      if (uploadedLogo?.public_id) {
        await fileUpload.deleteFromCloudinary(uploadedLogo.public_id);
      }

      throw error;
    }
  }

  async updateServiceCategoryStatus(
    id: string,
    status: 'approved' | 'rejected',
    adminId?: string,
    rejectionReason?: string,
  ) {
    const category = await this.getSingleServiceCategory(id);
    const adminObjectId = this.toObjectId(adminId);
    const now = new Date();
    const updatePayload =
      status === 'approved'
        ? {
            $set: {
              status,
              approvedByAdminId: adminObjectId,
              approvedAt: now,
              isActive: true,
            },
            $unset: {
              rejectedByAdminId: 1,
              rejectedAt: 1,
              rejectionReason: 1,
            },
          }
        : {
            $set: {
              status,
              rejectedByAdminId: adminObjectId,
              rejectedAt: now,
              ...(rejectionReason ? { rejectionReason } : {}),
              isActive: false,
            },
            $unset: {
              approvedByAdminId: 1,
              approvedAt: 1,
              ...(rejectionReason ? {} : { rejectionReason: 1 }),
            },
          };

    const updatedCategory = await this.serviceCategoryModel.findByIdAndUpdate(
      category.id,
      updatePayload,
      { new: true },
    );

    if (status === 'approved' && updatedCategory) {
      const pendingServiceOwnerIds = await this.businessServiceModel.distinct(
        'ownerId',
        {
          serviceCategoryId: updatedCategory._id,
          status: 'pending',
        },
      );
      const businessOwnersToNotify = await this.userModel
        .find({
          $and: [
            businessOwnerMembershipFilter,
            {
              $or: [
                {
                  'businessProfile.serviceCategoryId': updatedCategory._id,
                  'businessProfile.status': 'pending',
                },
                {
                  businessProfile: { $exists: false },
                  serviceCategoryId: updatedCategory._id,
                  status: 'pending',
                },
                ...(pendingServiceOwnerIds.length
                  ? [{ _id: { $in: pendingServiceOwnerIds } }]
                  : []),
              ],
            },
          ],
        })
        .select('email firstName lastName businessName businessProfile')
        .lean();

      await this.helpWantedModel.updateMany(
        {
          serviceCategoryId: updatedCategory._id,
          status: 'pending',
        },
        {
          $set: {
            category: updatedCategory.name,
            status: 'active',
            requestedCategory: null,
          },
        },
      );
      await this.businessServiceModel.updateMany(
        { serviceCategoryId: updatedCategory._id, status: 'pending' },
        {
          $set: {
            title: updatedCategory.name,
            status: 'active',
            requestedCategory: null,
          },
        },
      );
      await Promise.all([
        this.userModel.updateMany(
          {
            'businessProfile.serviceCategoryId': updatedCategory._id,
            'businessProfile.status': 'pending',
          },
          {
            $set: {
              'businessProfile.category': updatedCategory.name,
              'businessProfile.status': 'active',
              'businessProfile.requestedCategory': null,
            },
          },
        ),
        this.userModel.updateMany(
          {
            businessProfile: { $exists: false },
            serviceCategoryId: updatedCategory._id,
            role: 'businessOwner',
            status: 'pending',
          },
          {
            $set: {
              category: updatedCategory.name,
              status: 'active',
              requestedCategory: null,
            },
          },
        ),
      ]);

      this.notifyBusinessOwnersCategoryApproved(
        businessOwnersToNotify,
        updatedCategory.name,
      );
    }

    return updatedCategory;
  }

  async deleteServiceCategory(id: string) {
    const category = await this.getSingleServiceCategory(id);
    const result = await this.serviceCategoryModel.findByIdAndDelete(
      category.id,
    );

    if (category.logo?.publicId) {
      await fileUpload.deleteFromCloudinary(category.logo.publicId);
    }

    return result;
  }
}
