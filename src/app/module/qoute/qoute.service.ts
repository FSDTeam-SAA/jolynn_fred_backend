import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import type { IFilterParams } from 'src/app/helpers/pick';
import { User, UserDocument } from '../user/entities/user.entity';
import { CreateQouteDto } from './dto/create-qoute.dto';
import { UpdateQouteDto } from './dto/update-qoute.dto';
import { Qoute, QouteDocument } from './entities/qoute.entity';

const qouteSearchAbleFields = [
  'name',
  'email',
  'phoneNumber',
  'serviceNeeded',
  'projectDetails',
  'businessOwnerName',
  'status',
];

@Injectable()
export class QouteService {
  constructor(
    @InjectModel(Qoute.name)
    private readonly qouteModel: Model<QouteDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private normalizePayload<T extends CreateQouteDto | UpdateQouteDto>(payload: T) {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([, value]) => value !== undefined && value !== '',
      ),
    ) as T;
  }

  private toObjectId(id: string, label = 'reference') {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, 400);
    }

    return new Types.ObjectId(id);
  }

  private buildDisplayName(user: UserDocument) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return user.businessName || fullName || user.username || user.email;
  }

  private async getBusinessOwnerOrThrow(businessOwnerId: string) {
    const businessOwner = await this.userModel.findOne({
      _id: this.toObjectId(businessOwnerId, 'business owner id'),
      role: 'businessOwner',
    });

    if (!businessOwner) {
      throw new HttpException('Business owner not found', 404);
    }

    return businessOwner;
  }

  private async getUserOrThrow(userId: string) {
    const user = await this.userModel.findById(this.toObjectId(userId, 'user id'));

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    return user;
  }

  private async getQouteOrThrow(id: string) {
    const qoute = await this.qouteModel.findById(this.toObjectId(id, 'qoute id'));

    if (!qoute) {
      throw new HttpException('Qoute request not found', 404);
    }

    return qoute;
  }

  private async getOwnedQouteOrThrow(id: string, businessOwnerId: string) {
    const qoute = await this.qouteModel.findOne({
      _id: this.toObjectId(id, 'qoute id'),
      businessOwnerId: this.toObjectId(businessOwnerId, 'business owner id'),
    });

    if (!qoute) {
      throw new HttpException('Qoute request not found', 404);
    }

    return qoute;
  }

  private async getUserOwnedQouteOrThrow(id: string, userId: string) {
    const qoute = await this.qouteModel.findOne({
      _id: this.toObjectId(id, 'qoute id'),
      userId: this.toObjectId(userId, 'user id'),
    });

    if (!qoute) {
      throw new HttpException('Qoute request not found', 404);
    }

    return qoute;
  }

  private async createQouteRecord(
    payload: CreateQouteDto,
    businessOwner: UserDocument,
    userId?: string,
  ) {
    return this.qouteModel.create({
      ...payload,
      email: payload.email.toLowerCase(),
      businessOwnerId: businessOwner._id,
      businessOwnerName: this.buildDisplayName(businessOwner),
      ...(userId
        ? { userId: this.toObjectId(userId, 'user id') }
        : {}),
    });
  }

  private async getPaginatedQoutes(
    whereConditions: Record<string, unknown>,
    options: IOptions,
  ) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const total = await this.qouteModel.countDocuments(whereConditions);
    const qoutes = await this.qouteModel
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
      data: qoutes,
    };
  }

  async createQoute(createQouteDto: CreateQouteDto) {
    const payload = this.normalizePayload(createQouteDto);
    const businessOwner = await this.getBusinessOwnerOrThrow(
      payload.businessOwnerId,
    );

    return this.createQouteRecord(payload, businessOwner);
  }

  async createMyQoute(userId: string, createQouteDto: CreateQouteDto) {
    await this.getUserOrThrow(userId);

    const payload = this.normalizePayload(createQouteDto);
    const businessOwner = await this.getBusinessOwnerOrThrow(
      payload.businessOwnerId,
    );

    return this.createQouteRecord(payload, businessOwner, userId);
  }

  async getAllQoute(params: IFilterParams, options: IOptions) {
    const whereConditions = buildWhereConditions(params, qouteSearchAbleFields);

    return this.getPaginatedQoutes(whereConditions, options);
  }

  async getMyBusinessQoutes(
    businessOwnerId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    await this.getBusinessOwnerOrThrow(businessOwnerId);

    const whereConditions = buildWhereConditions(
      params,
      qouteSearchAbleFields,
      {
        businessOwnerId: this.toObjectId(businessOwnerId, 'business owner id'),
      },
    );

    return this.getPaginatedQoutes(whereConditions, options);
  }

  async getMyUserQoutes(
    userId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    await this.getUserOrThrow(userId);

    const whereConditions = buildWhereConditions(
      params,
      qouteSearchAbleFields,
      {
        userId: this.toObjectId(userId, 'user id'),
      },
    );

    return this.getPaginatedQoutes(whereConditions, options);
  }

  async getSingleQoute(id: string) {
    return this.getQouteOrThrow(id);
  }

  async getMyBusinessSingleQoute(id: string, businessOwnerId: string) {
    return this.getOwnedQouteOrThrow(id, businessOwnerId);
  }

  async getMyUserSingleQoute(id: string, userId: string) {
    await this.getUserOrThrow(userId);
    return this.getUserOwnedQouteOrThrow(id, userId);
  }

  async updateQoute(id: string, updateQouteDto: UpdateQouteDto) {
    const qoute = await this.getQouteOrThrow(id);
    const payload = this.normalizePayload(updateQouteDto);

    const updatedQoute = await this.qouteModel.findByIdAndUpdate(
      qoute._id,
      payload,
      { new: true, runValidators: true },
    );

    return updatedQoute;
  }

  async updateMyBusinessQoute(
    id: string,
    businessOwnerId: string,
    updateQouteDto: UpdateQouteDto,
  ) {
    const qoute = await this.getOwnedQouteOrThrow(id, businessOwnerId);
    const payload = this.normalizePayload(updateQouteDto);

    const updatedQoute = await this.qouteModel.findByIdAndUpdate(
      qoute._id,
      payload,
      { new: true, runValidators: true },
    );

    return updatedQoute;
  }

  async deleteQoute(id: string) {
    const qoute = await this.getQouteOrThrow(id);
    await this.qouteModel.findByIdAndDelete(qoute._id);
    return qoute;
  }

  async deleteMyUserQoute(id: string, userId: string) {
    await this.getUserOrThrow(userId);
    const qoute = await this.getUserOwnedQouteOrThrow(id, userId);
    await this.qouteModel.findByIdAndDelete(qoute._id);
    return qoute;
  }
}
