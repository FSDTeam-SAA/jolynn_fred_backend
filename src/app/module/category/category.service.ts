import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryDocument } from './entities/category.entity';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

const categorySearchAbleFields = ['name'];

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async createCategory(createCategoryDto: CreateCategoryDto) {
    const existing = await this.categoryModel.findOne({
      name: createCategoryDto.name,
    });
    if (existing) {
      throw new HttpException('Category already exists', 400);
    }

    const category = await this.categoryModel.create(createCategoryDto);
    return category;
  }

  async getAllCategory(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      categorySearchAbleFields,
    );

    const total = await this.categoryModel.countDocuments(whereConditions);
    const categories = await this.categoryModel
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
      data: categories,
    };
  }

  async getSingleCategory(id: string) {
    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new HttpException('Category not found', 404);
    }
    return category;
  }

  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new HttpException('Category not found', 404);
    }

    if (updateCategoryDto.name) {
      const existing = await this.categoryModel.findOne({
        name: updateCategoryDto.name,
        _id: { $ne: id },
      });
      if (existing) {
        throw new HttpException('Category already exists', 400);
      }
    }

    const updatedCategory = await this.categoryModel.findByIdAndUpdate(
      id,
      updateCategoryDto,
      { new: true },
    );
    return updatedCategory;
  }

  async deleteCategory(id: string) {
    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new HttpException('Category not found', 404);
    }
    const result = await this.categoryModel.findByIdAndDelete(id);
    return result;
  }
}
