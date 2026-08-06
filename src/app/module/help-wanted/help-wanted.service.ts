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

  private async buildSearchConditions(params: IFilterParams) {
    const searchRegex = this.buildContainsRegex(params.searchTerm);
    if (!searchRegex) {
      return buildWhereConditions(params, helpWantedSearchAbleFields);
    }

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
        .select('_id'),
    ]);

    const searchableFields = helpWantedSearchAbleFields.map((field) => ({
      [field]: { $regex: searchRegex },
    }));

    if (matchingCategoryIds.length) {
      searchableFields.push({
        serviceCategoryId: { $in: matchingCategoryIds },
      } as any);
    }

    if (matchingPosterIds.length) {
      searchableFields.push({
        userId: {
          $in: matchingPosterIds.map((poster) => poster._id),
        },
      } as any);
    }

    const { searchTerm: _searchTerm, ...filters } = params;
    return buildWhereConditions(filters, [], { $or: searchableFields });
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
    const categoryName = serviceCategory?.name ?? createHelpWantedDto.category;
    const helpWanted = await this.helpWantedModel.create({
      ...createHelpWantedDto,
      userId,
      category: categoryName,
      serviceCategoryId: serviceCategory?._id,
    });
    return helpWanted;
  }

  async getAllHelpWanted(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = await this.buildSearchConditions(params);

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
