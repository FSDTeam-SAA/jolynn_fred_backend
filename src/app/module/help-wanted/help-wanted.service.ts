import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateHelpWantedDto } from './dto/create-help-wanted.dto';
import { UpdateHelpWantedDto } from './dto/update-help-wanted.dto';
import {
  HelpWanted,
  HelpWantedDocument,
  HelpWantedImage,
} from './entities/help-wanted.entity';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import { ServiceCategoryService } from '../service-category/service-category.service';
import { ServiceCategory } from '../service-category/entities/service-category.entity';
import { User, UserDocument } from '../user/entities/user.entity';
import { fileUpload } from 'src/app/helpers/fileUploder';
import {HelpWantedCounter, HelpWantedCounterDocument,} from './entities/help-wanted-counter.entity';
const helpWantedSearchAbleFields = [
  'username',
  'email',
  'zipcode',
  'city',
  'state',
  'category',
  'budgetRange',
  'phone',
  'message',
];

const serviceCategorySearchableFields = [
  'name',
  'slug',
  'normalizedName',
  'description',
  'logo.url',
  'logo.publicId',
  'status',
  'source',
  'rejectionReason',
];

const posterSearchableFields = [
  'email',
  'username',
  'userProfile.firstName',
  'userProfile.lastName',
  'userProfile.phoneNumber',
  'userProfile.country',
  'userProfile.city',
  'userProfile.state',
  'userProfile.address',
  'userProfile.postcode',
  'userProfile.bio',
  'businessProfile.ownerName',
  'businessProfile.businessName',
  'businessProfile.businessEmail',
  'businessProfile.businessWebsiteUrl',
  'businessProfile.serviceArea',
  'businessProfile.category',
  'businessProfile.country',
  'businessProfile.city',
  'businessProfile.state',
  'businessProfile.address',
  'businessProfile.postcode',
  'businessProfile.bio',
  // Legacy profile fields.
  'firstName',
  'lastName',
  'businessName',
];

const posterLocationFields = [
  'userProfile.city',
  'userProfile.state',
  'userProfile.country',
  'userProfile.address',
  'userProfile.postcode',
  'businessProfile.city',
  'businessProfile.state',
  'businessProfile.country',
  'businessProfile.address',
  'businessProfile.serviceArea',
  'businessProfile.postcode',
  'city',
  'state',
];

@Injectable()
export class HelpWantedService {
  constructor(
    @InjectModel(HelpWanted.name)
    private readonly helpWantedModel: Model<HelpWantedDocument>,
    @InjectModel(ServiceCategory.name)
    private readonly serviceCategoryModel: Model<ServiceCategory>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(HelpWantedCounter.name)
    private readonly counterModel: Model<HelpWantedCounterDocument>,
    private readonly serviceCategoryService: ServiceCategoryService,
  ) {}

  private buildContainsRegex(value?: string) {
    if (!value?.trim()) {
      return null;
    }

    const escapedValue = value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escapedValue, 'i');
  }

  private buildExactRegex(value?: string) {
    if (!value?.trim()) {
      return null;
    }

    const escapedValue = value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escapedValue}$`, 'i');
  }

  private isOtherCategory(category?: string) {
    return ['other', 'others', '__other__'].includes(
      category?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '',
    );
  }

  private async uploadImages(
    files?: Express.Multer.File[],
  ): Promise<HelpWantedImage[]> {
    if (!files?.length) {
      return [];
    }

    const uploads = await Promise.all(
      files.map((file) => fileUpload.uploadToCloudinary(file)),
    );

    return uploads.map((file) => ({
      url: file.url,
      publicId: file.public_id,
    }));
  }

  private async deleteImages(images?: HelpWantedImage[]) {
    if (!images?.length) {
      return;
    }

    await Promise.all(
      images.map((image) => fileUpload.deleteFromCloudinary(image.publicId)),
    );
  }
  private async generateJobId(): Promise<string> {
    const counter = await this.counterModel.findOneAndUpdate(
      { name: 'help_wanted' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return `JOB-${String(counter.seq).padStart(6, '0')}`;
  }
  private buildBudgetRangeCondition(budgetRange?: unknown) {
    if (typeof budgetRange !== 'string') {
      return undefined;
    }

    const rangeValues = budgetRange
      .match(/[0-9,]+(?:\.[0-9]+)?/g)
      ?.map((value) => Number(value.replace(/,/g, '')));

    if (
      !rangeValues ||
      rangeValues.length < 2 ||
      rangeValues.some(Number.isNaN)
    ) {
      return undefined;
    }

    const [requestedMin, requestedMax] = [rangeValues[0], rangeValues[1]].sort(
      (a, b) => a - b,
    );

    return {
      $expr: {
        $let: {
          vars: {
            budgetValues: {
              $map: {
                input: {
                  $regexFindAll: {
                    input: { $ifNull: ['$budgetRange', ''] },
                    regex: /[0-9,]+(?:\.[0-9]+)?/g,
                  },
                },
                as: 'value',
                in: {
                  $convert: {
                    input: {
                      $replaceAll: {
                        input: '$$value.match',
                        find: ',',
                        replacement: '',
                      },
                    },
                    to: 'double',
                    onError: null,
                    onNull: null,
                  },
                },
              },
            },
          },
          in: {
            $and: [
              { $lte: [{ $arrayElemAt: ['$$budgetValues', 0] }, requestedMax] },
              { $gte: [{ $arrayElemAt: ['$$budgetValues', 1] }, requestedMin] },
            ],
          },
        },
      },
    };
  }

  private async buildSearchConditions(params: IFilterParams) {
    const budgetCondition = this.buildBudgetRangeCondition(params.budgetRange);
    const {
      searchTerm,
      budgetRange: _budgetRange,
      category,
      city,
      state,
      location,
      status,
      ...otherFilters
    } = params;
    const filters = otherFilters;
    const searchRegex = this.buildContainsRegex(params.searchTerm);
    const andConditions: Record<string, unknown>[] = [];

    if (Object.keys(filters).length) {
      andConditions.push(buildWhereConditions(filters));
    }

    if (budgetCondition) {
      andConditions.push(budgetCondition);
    }

    const categoryRegex = this.buildExactRegex(category);
    if (categoryRegex) {
      const matchingCategoryIds = await this.serviceCategoryModel
        .find({
          $or: serviceCategorySearchableFields.map((field) => ({
            [field]: { $regex: categoryRegex },
          })),
        })
        .distinct('_id');

      andConditions.push({
        $or: [
          { category: { $regex: categoryRegex } },
          ...(matchingCategoryIds.length
            ? [{ serviceCategoryId: { $in: matchingCategoryIds } }]
            : []),
        ],
      });
    }

    const statusRegex = this.buildExactRegex(status);
    if (statusRegex) {
      andConditions.push({ status: { $regex: statusRegex } });
    }

    // Location can come from the public post itself or its linked poster.
    // Public posts may not have a userId, so filtering only User misses them.
    const cityRegex = this.buildContainsRegex(city);
    const stateRegex = this.buildContainsRegex(state);
    const [cityPosterIds, statePosterIds] = await Promise.all([
      cityRegex
        ? this.userModel
            .find({
              $or: [
                { 'userProfile.city': { $regex: cityRegex } },
                { 'businessProfile.city': { $regex: cityRegex } },
                { city: { $regex: cityRegex } },
              ],
            })
            .distinct('_id')
        : Promise.resolve([]),
      stateRegex
        ? this.userModel
            .find({
              $or: [
                { 'userProfile.state': { $regex: stateRegex } },
                { 'businessProfile.state': { $regex: stateRegex } },
                { state: { $regex: stateRegex } },
              ],
            })
            .distinct('_id')
        : Promise.resolve([]),
    ]);

    if (cityRegex) {
      andConditions.push({
        $or: [
          { city: { $regex: cityRegex } },
          { userId: { $in: cityPosterIds } },
        ],
      });
    }

    if (stateRegex) {
      andConditions.push({
        $or: [
          { state: { $regex: stateRegex } },
          { userId: { $in: statePosterIds } },
        ],
      });
    }

    const locationRegex = this.buildContainsRegex(location);
    if (locationRegex) {
      andConditions.push({
        $or: [
          { zipcode: { $regex: locationRegex } },
          { city: { $regex: locationRegex } },
          { state: { $regex: locationRegex } },
          {
            userId: {
              $in: await this.userModel
                .find({
                  $or: posterLocationFields.map((field) => ({
                    [field]: { $regex: locationRegex },
                  })),
                })
                .distinct('_id'),
            },
          },
        ],
      });
    }

    if (searchRegex) {
      const [matchingCategoryIds, matchingPosterIds] = await Promise.all([
        this.serviceCategoryModel
          .find({
            $or: serviceCategorySearchableFields.map((field) => ({
              [field]: { $regex: searchRegex },
            })),
          })
          .distinct('_id'),
        this.userModel
          .find({
            $or: posterSearchableFields.map((field) => ({
              [field]: { $regex: searchRegex },
            })),
          })
          .distinct('_id'),
      ]);

      andConditions.push({
        $or: [
          ...helpWantedSearchAbleFields.map((field) => ({
            [field]: { $regex: searchRegex },
          })),
          ...(matchingCategoryIds.length
            ? [{ serviceCategoryId: { $in: matchingCategoryIds } }]
            : []),
          ...(matchingPosterIds.length
            ? [{ userId: { $in: matchingPosterIds } }]
            : []),
        ],
      });
    }

    return andConditions.length ? { $and: andConditions } : {};
  }

   async createHelpWanted(
    createHelpWantedDto: CreateHelpWantedDto,
    userId?: string,
    imageFiles?: Express.Multer.File[],
  ) {
    const jobId = await this.generateJobId();
    const usesOtherCategory = this.isOtherCategory(
      createHelpWantedDto.category,
    );
    const customCategory = createHelpWantedDto.requestedCategory?.trim();

    if (usesOtherCategory && !customCategory) {
      throw new HttpException(
        'Requested category is required when category is Other',
        400,
      );
    }

    const serviceCategory = usesOtherCategory
      ? null
      : await this.serviceCategoryService.resolveCategorySelection(
          createHelpWantedDto.category,
          undefined,
          'help_wanted',
          userId,
        );
    const categoryName = usesOtherCategory
      ? customCategory!
      : serviceCategory!.name;
    const images = await this.uploadImages(imageFiles);
    const helpWanted = await this.helpWantedModel.create({
      ...createHelpWantedDto,
      jobId,
      images,
      userId,
      category: categoryName,
      requestedCategory: usesOtherCategory ? customCategory : null,
      ...(serviceCategory
        ? { serviceCategoryId: serviceCategory._id }
        : {}),
      status: 'active',
    });

    return helpWanted;
  }

  async getAllHelpWanted(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = await this.buildSearchConditions({
      ...params,
      status: params.status ?? 'active',
    });

    const total = await this.helpWantedModel.countDocuments(whereConditions);
    const helpWanteds = await this.helpWantedModel
      .find(whereConditions)
      .populate(
        'userId',
        'firstName lastName email username phoneNumber profilePicture',
      )
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any);

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: helpWanteds,
    };
  }

  async getMyHelpWanted(
    userId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = {
      ...(await this.buildSearchConditions(params)),
      userId,
    };

    const total = await this.helpWantedModel.countDocuments(whereConditions);
    const helpWanteds = await this.helpWantedModel
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
      data: helpWanteds,
    };
  }

  async getSingleHelpWanted(id: string) {
    const helpWanted = await this.helpWantedModel
      .findById(id)
      .populate(
        'userId',
        'firstName lastName email username phoneNumber profilePicture',
      );
    if (!helpWanted) {
      throw new HttpException('Help wanted request not found', 404);
    }
    return helpWanted;
  }

  async updateHelpWanted(
    id: string,
    updateHelpWantedDto: UpdateHelpWantedDto,
    imageFiles?: Express.Multer.File[],
  ) {
    const helpWanted = await this.helpWantedModel.findById(id);
    if (!helpWanted) {
      throw new HttpException('Help wanted request not found', 404);
    }

    const uploadedImages = await this.uploadImages(imageFiles);
    const nextImages = [...(helpWanted.images ?? []), ...uploadedImages];
    const updatedHelpWanted = await this.helpWantedModel.findByIdAndUpdate(
      id,
      {
        ...updateHelpWantedDto,
        images: nextImages,
      },
      { new: true, runValidators: true },
    );
    return updatedHelpWanted;
  }

  async deleteHelpWanted(
    id: string,
    requesterId: string,
    requesterRole: string,
  ) {
    const helpWanted = await this.helpWantedModel.findById(id);
    if (!helpWanted) {
      throw new HttpException('Help wanted request not found', 404);
    }

    const isOwner =
      helpWanted.userId && helpWanted.userId.toString() === requesterId;
    const isAdmin = requesterRole === 'admin';

    if (!isOwner && !isAdmin) {
      throw new HttpException('You are not allowed to delete this post', 403);
    }

    await this.deleteImages(helpWanted.images);
    const result = await this.helpWantedModel.findByIdAndDelete(id);
    return result;
  }
}
