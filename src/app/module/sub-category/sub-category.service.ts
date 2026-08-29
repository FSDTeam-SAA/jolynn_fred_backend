import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import { IFilterParams } from 'src/app/helpers/pick';
import {
  BusinessService,
  BusinessServiceDocument,
} from '../service/entities/service.entity';
import { CreateSubCategoriesDto } from './dto/create-sub-categories.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import {
  SubCategory,
  SubCategoryDocument,
} from './entities/sub-category.entity';

@Injectable()
export class SubCategoryService {
  constructor(
    @InjectModel(SubCategory.name)
    private readonly subCategoryModel: Model<SubCategoryDocument>,
    @InjectModel(BusinessService.name)
    private readonly businessServiceModel: Model<BusinessServiceDocument>,
  ) {}

  private normalizeName(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  private toObjectId(id: string, label: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label} id`, 400);
    }

    return new Types.ObjectId(id);
  }

  private async getOwnedServiceOrThrow(
    serviceId: string | Types.ObjectId,
    requesterId: string,
    requesterRole: string,
  ) {
    const serviceObjectId =
      serviceId instanceof Types.ObjectId
        ? serviceId
        : this.toObjectId(serviceId, 'service');
    const service = await this.businessServiceModel.findById(serviceObjectId);

    if (!service) {
      throw new HttpException('Service not found', 404);
    }

    if (
      requesterRole !== 'admin' &&
      service.ownerId.toString() !== requesterId
    ) {
      throw new HttpException(
        'You are not allowed to manage subcategories for this service',
        403,
      );
    }

    return service;
  }

  async createSubCategories(
    dto: CreateSubCategoriesDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const service = await this.getOwnedServiceOrThrow(
      dto.serviceId,
      requesterId,
      requesterRole,
    );
    const serviceId = service._id;
    const names = [
      ...new Map(
        dto.subcategories
          .map((name) => this.normalizeName(name))
          .filter(Boolean)
          .map((name) => [name.toLowerCase(), name]),
      ).values(),
    ];

    if (!names.length) {
      throw new HttpException('At least one subcategory is required', 400);
    }

    const existingSubCategories = await this.subCategoryModel
      .find({ serviceId })
      .collation({ locale: 'en', strength: 2 });
    const existingNames = new Set(
      existingSubCategories.map((item) => item.subcategory.toLowerCase()),
    );
    const newNames = names.filter(
      (name) => !existingNames.has(name.toLowerCase()),
    );

    if (newNames.length) {
      try {
        await this.subCategoryModel.insertMany(
          newNames.map((subcategory) => ({ serviceId, subcategory })),
        );
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) {
          throw error;
        }
      }
    }

    const requestedNames = new Set(names.map((name) => name.toLowerCase()));
    const subcategories = await this.subCategoryModel
      .find({ serviceId })
      .collation({ locale: 'en', strength: 2 })
      .sort({ subcategory: 1 });

    return subcategories.filter((item) =>
      requestedNames.has(item.subcategory.toLowerCase()),
    );
  }

  async getAllSubCategories(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions: Record<string, unknown> = {};

    if (params.serviceId) {
      whereConditions.serviceId = this.toObjectId(
        String(params.serviceId),
        'service',
      );
    }

    if (params.searchTerm && typeof params.searchTerm === 'string') {
      const escapedSearchTerm = params.searchTerm
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      whereConditions.subcategory = {
        $regex: new RegExp(escapedSearchTerm, 'i'),
      };
    }

    const [total, subcategories] = await Promise.all([
      this.subCategoryModel.countDocuments(whereConditions),
      this.subCategoryModel
        .find(whereConditions)
        .populate(
          'serviceId',
          'ownerId title serviceCategoryId status createdAt',
        )
        .skip(skip)
        .limit(limit)
        .sort({ [sortBy]: sortOrder } as any),
    ]);

    return {
      meta: { page, limit, total },
      data: subcategories,
    };
  }

  async getSingleSubCategory(id: string) {
    const subcategory = await this.subCategoryModel
      .findById(this.toObjectId(id, 'subcategory'))
      .populate(
        'serviceId',
        'ownerId title serviceCategoryId status createdAt',
      );

    if (!subcategory) {
      throw new HttpException('Subcategory not found', 404);
    }

    return subcategory;
  }

  async updateSubCategory(
    id: string,
    dto: UpdateSubCategoryDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const current = await this.subCategoryModel.findById(
      this.toObjectId(id, 'subcategory'),
    );
    if (!current) {
      throw new HttpException('Subcategory not found', 404);
    }

    await this.getOwnedServiceOrThrow(
      current.serviceId,
      requesterId,
      requesterRole,
    );
    const targetService = dto.serviceId
      ? await this.getOwnedServiceOrThrow(
          dto.serviceId,
          requesterId,
          requesterRole,
        )
      : null;
    const serviceId = targetService?._id ?? current.serviceId;
    const subcategory = dto.subcategory
      ? this.normalizeName(dto.subcategory)
      : current.subcategory;

    const duplicate = await this.subCategoryModel
      .findOne({
        _id: { $ne: current._id },
        serviceId,
        subcategory,
      })
      .collation({ locale: 'en', strength: 2 });

    if (duplicate) {
      throw new HttpException(
        'Subcategory already exists under this service',
        400,
      );
    }

    try {
      return await this.subCategoryModel
        .findByIdAndUpdate(
          current._id,
          { serviceId, subcategory },
          { new: true, runValidators: true },
        )
        .populate(
          'serviceId',
          'ownerId title serviceCategoryId status createdAt',
        );
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new HttpException(
          'Subcategory already exists under this service',
          400,
        );
      }

      throw error;
    }
  }

  async deleteSubCategory(
    id: string,
    requesterId: string,
    requesterRole: string,
  ) {
    const subcategory = await this.subCategoryModel.findById(
      this.toObjectId(id, 'subcategory'),
    );

    if (!subcategory) {
      throw new HttpException('Subcategory not found', 404);
    }

    await this.getOwnedServiceOrThrow(
      subcategory.serviceId,
      requesterId,
      requesterRole,
    );
    await this.subCategoryModel.findByIdAndDelete(subcategory._id);

    return subcategory;
  }

  async findMatchingServiceIds(searchRegex: RegExp | null) {
    if (!searchRegex) {
      return [];
    }

    return this.subCategoryModel.distinct('serviceId', {
      subcategory: { $regex: searchRegex },
    });
  }

  async deleteByServiceId(serviceId: Types.ObjectId) {
    await this.subCategoryModel.deleteMany({ serviceId });
  }
}
