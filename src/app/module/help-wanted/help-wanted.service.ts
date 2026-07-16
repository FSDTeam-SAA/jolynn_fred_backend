import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateHelpWantedDto } from './dto/create-help-wanted.dto';
import { UpdateHelpWantedDto } from './dto/update-help-wanted.dto';
import { HelpWanted, HelpWantedDocument } from './entities/help-wanted.entity';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

const helpWantedSearchAbleFields = [
  'username',
  'email',
  'zipcode',
  'category',
  'phone',
  'message',
];

@Injectable()
export class HelpWantedService {
  constructor(
    @InjectModel(HelpWanted.name)
    private readonly helpWantedModel: Model<HelpWantedDocument>,
  ) {}

 async createHelpWanted(
    createHelpWantedDto: CreateHelpWantedDto,
    userId?: string,
  ) {
    const helpWanted = await this.helpWantedModel.create({
      ...createHelpWantedDto,
      ...(userId ? { userId } : {}),
    });
    return helpWanted;
  }

  async getAllHelpWanted(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      helpWantedSearchAbleFields,
    );

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

async getMyHelpWanted(userId: string, params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = {
      ...buildWhereConditions(params, helpWantedSearchAbleFields),
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
    const helpWanted = await this.helpWantedModel.findById(id);
    if (!helpWanted) {
      throw new HttpException('Help wanted request not found', 404);
    }
    return helpWanted;
  }

async updateHelpWanted(
    id: string,
    updateHelpWantedDto: UpdateHelpWantedDto,
  ) {
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

async deleteHelpWanted(id: string, requesterId: string, requesterRole: string) {
    const helpWanted = await this.helpWantedModel.findById(id);
    if (!helpWanted) {
      throw new HttpException('Help wanted request not found', 404);
    }

    const isOwner =
      helpWanted.userId && helpWanted.userId.toString() === requesterId;
    const isAdmin = requesterRole === 'admin';

    if (!isOwner && !isAdmin) {
      throw new HttpException(
        'You are not allowed to delete this post',
        403,
      );
    }

    const result = await this.helpWantedModel.findByIdAndDelete(id);
    return result;
  }
}