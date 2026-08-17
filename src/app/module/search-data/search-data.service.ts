import {
  HttpException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as cron from 'node-cron';
import { CreateSearchDataDto } from './dto/create-search-data.dto';
import { SearchData, SearchDataDocument } from './entities/search-data.entity';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import type { IFilterParams } from 'src/app/helpers/pick';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

const searchDataSearchableFields = ['keyword'];

@Injectable()
export class SearchDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchDataService.name);
  private cleanupTask?: cron.ScheduledTask;

  constructor(
    @InjectModel(SearchData.name)
    private readonly searchDataModel: Model<SearchDataDocument>,
  ) {}

  onModuleInit() {
    this.cleanupTask = cron.schedule('0 2 * * *', () => {
      void this.deleteOlderThanOneMonth();
    });
  }

  onModuleDestroy() {
    this.cleanupTask?.stop();
  }

  async recordKeyword(keyword?: string) {
    const normalizedKeyword = keyword?.trim();
    if (!normalizedKeyword) return null;

    return this.searchDataModel.create({ keyword: normalizedKeyword });
  }

  async createSearchData(createSearchDataDto: CreateSearchDataDto) {
    return this.recordKeyword(createSearchDataDto.keyword);
  }

  async getAllSearchData(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ...options,
    });
    const whereConditions = buildWhereConditions(
      params,
      searchDataSearchableFields,
    );

    const total = await this.searchDataModel.countDocuments(whereConditions);
    const searchData = await this.searchDataModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any);

    return {
      meta: { page, limit, total },
      data: searchData,
    };
  }

  async deleteSearchData(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Search data not found', 404);
    }

    const deleted = await this.searchDataModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new HttpException('Search data not found', 404);
    }

    return deleted;
  }

  async bulkDeleteSearchData(ids: string[]) {
    const result = await this.searchDataModel.deleteMany({
      _id: { $in: ids.filter((id) => Types.ObjectId.isValid(id)) },
    });

    return { deletedCount: result.deletedCount };
  }

  private async deleteOlderThanOneMonth() {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 1);

    try {
      const result = await this.searchDataModel.deleteMany({
        createdAt: { $lt: cutoffDate },
      });
      if (result.deletedCount) {
        this.logger.log(`Deleted ${result.deletedCount} expired search records`);
      }
    } catch (error) {
      this.logger.error('Failed to delete expired search records', error);
    }
  }
}
