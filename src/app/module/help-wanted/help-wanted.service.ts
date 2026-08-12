import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateHelpWantedDto } from './dto/create-help-wanted.dto';
import { UpdateHelpWantedDto } from './dto/update-help-wanted.dto';
import { HelpWanted, HelpWantedDocument } from './entities/help-wanted.entity';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import { ServiceCategoryService } from '../service-category/service-category.service';
import { ServiceCategory } from '../service-category/entities/service-category.entity';
import { User, UserDocument } from '../user/entities/user.entity';
import sendMailer from 'src/app/helpers/sendMailer';
import { createNotificationEmailTemplate } from 'src/app/helpers/template';
import config from 'src/app/config';

const helpWantedSearchAbleFields = [
  'username',
  'email',
  'zipcode',
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
  'firstName',
  'lastName',
  'email',
  'username',
  'gender',
  'phoneNumber',
  'businessName',
  'businessEmail',
  'businessWebsiteUrl',
  'serviceArea',
  'category',
  'country',
  'city',
  'state',
  'address',
  'postcode',
  'bio',
  'tag',
];

const posterLocationFields = [
  'city',
  'state',
  'country',
  'address',
  'serviceArea',
  'postcode',
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

    const posterFilter: Record<string, unknown> = {};
    const cityRegex = this.buildExactRegex(city);
    const stateRegex = this.buildExactRegex(state);
    if (cityRegex) posterFilter.city = { $regex: cityRegex };
    if (stateRegex) posterFilter.state = { $regex: stateRegex };

    const locationRegex = this.buildContainsRegex(location);
    if (locationRegex) {
      andConditions.push({
        $or: [
          { zipcode: { $regex: locationRegex } },
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

    if (Object.keys(posterFilter).length) {
      andConditions.push({
        userId: {
          $in: await this.userModel.find(posterFilter).distinct('_id'),
        },
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
  ) {
    const serviceCategory =
      await this.serviceCategoryService.resolveCategorySelection(
        createHelpWantedDto.category,
        createHelpWantedDto.requestedCategory,
        'help_wanted',
        userId,
      );
    const usesOtherCategory = this.isOtherCategory(
      createHelpWantedDto.category,
    );
    const isPendingCategory = serviceCategory.status === 'pending';
    const isPendingOtherCategory = usesOtherCategory && isPendingCategory;
    const categoryName = isPendingOtherCategory
      ? createHelpWantedDto.category
      : serviceCategory.name;
    const helpWanted = await this.helpWantedModel.create({
      ...createHelpWantedDto,
      userId,
      category: categoryName,
      requestedCategory: isPendingOtherCategory
        ? createHelpWantedDto.requestedCategory
        : null,
      serviceCategoryId: serviceCategory?._id,
      status: isPendingCategory ? 'pending' : 'active',
    });

    if (isPendingOtherCategory && config.email.admin) {
      sendMailer(
        config.email.admin,
        'Help Wanted Post Requires Category Approval',
        createNotificationEmailTemplate({
          heading: 'Category Approval Needed',
          subheading: 'A new Help Wanted post is waiting for review.',
          introText:
            'A user submitted a Help Wanted post using a new category. Please review and approve the requested category before publishing this post on the platform.',
          details: [
            {
              label: 'Requested Category',
              value: createHelpWantedDto.requestedCategory!,
            },
            { label: 'Posted By', value: createHelpWantedDto.username },
            { label: 'Post Email', value: createHelpWantedDto.email },
            { label: 'Post Message', value: createHelpWantedDto.message },
          ],
          noteTitle: 'Action required',
          noteText:
            'Approve or reject the requested category from the admin dashboard.',
        }),
      ).catch((error) =>
        console.error(
          'Failed to send help wanted category approval email:',
          error,
        ),
      );
    }

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

  async updateHelpWanted(id: string, updateHelpWantedDto: UpdateHelpWantedDto) {
    const helpWanted = await this.helpWantedModel.findById(id);
    if (!helpWanted) {
      throw new HttpException('Help wanted request not found', 404);
    }

    const updatedHelpWanted = await this.helpWantedModel.findByIdAndUpdate(
      id,
      updateHelpWantedDto,
      { new: true },
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

    const result = await this.helpWantedModel.findByIdAndDelete(id);
    return result;
  }
}
