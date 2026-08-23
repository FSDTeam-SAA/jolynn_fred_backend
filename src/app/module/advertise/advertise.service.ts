import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAdvertiseDto } from './dto/create-advertise.dto';
import { UpdateAdvertiseDto } from './dto/update-advertise.dto';
import { Advertise, AdvertiseDocument } from './entities/advertise.entity';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

const advertiseSearchAbleFields = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'message',
];

@Injectable()
export class AdvertiseService {
  constructor(
    @InjectModel(Advertise.name)
    private readonly advertiseModel: Model<AdvertiseDocument>,
  ) {}

  async createAdvertise(createAdvertiseDto: CreateAdvertiseDto) {
    const advertise = await this.advertiseModel.create(createAdvertiseDto);
    return advertise;
  }

  async getAllAdvertise(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      advertiseSearchAbleFields,
    );

    const total = await this.advertiseModel.countDocuments(whereConditions);
    const advertises = await this.advertiseModel
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
      data: advertises,
    };
  }

  async getSingleAdvertise(id: string) {
    const advertise = await this.advertiseModel.findById(id);
    if (!advertise) {
      throw new HttpException('Advertise request not found', 404);
    }
    return advertise;
  }

  async updateAdvertise(id: string, updateAdvertiseDto: UpdateAdvertiseDto) {
    const advertise = await this.advertiseModel.findById(id);
    if (!advertise) {
      throw new HttpException('Advertise request not found', 404);
    }

    const updatedAdvertise = await this.advertiseModel.findByIdAndUpdate(
      id,
      updateAdvertiseDto,
      { new: true },
    );
    return updatedAdvertise;
  }

  async deleteAdvertise(id: string) {
    const advertise = await this.advertiseModel.findById(id);
    if (!advertise) {
      throw new HttpException('Advertise request not found', 404);
    }
    const result = await this.advertiseModel.findByIdAndDelete(id);
    return result;
  }
}
