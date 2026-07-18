import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import { fileUpload } from 'src/app/helpers/fileUploder';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import type { IFilterParams } from 'src/app/helpers/pick';
import { User, UserDocument } from '../user/entities/user.entity';
import { CreateGallaryDto } from './dto/create-gallary.dto';
import { UpdateGallaryDto } from './dto/update-gallary.dto';
import {
  Gallary,
  GallaryDocument,
  GallaryImage,
} from './entities/gallary.entity';

const gallarySearchAbleFields = ['title'];

@Injectable()
export class GallaryService {
  constructor(
    @InjectModel(Gallary.name)
    private readonly gallaryModel: Model<GallaryDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private normalizePayload<T extends CreateGallaryDto | UpdateGallaryDto>(
    payload: T,
  ) {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([, value]) => value !== undefined && value !== '',
      ),
    ) as T;
  }

  private toObjectId(id: string, label = 'gallary reference') {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, 400);
    }

    return new Types.ObjectId(id);
  }

  private async ensurePublicBusinessOwnerExists(ownerId: string) {
    const owner = await this.userModel.exists({
      _id: this.toObjectId(ownerId, 'business owner id'),
      role: 'businessOwner',
      status: 'active',
    });

    if (!owner) {
      throw new HttpException('Business owner not found', 404);
    }
  }

  private async ensureUniqueTitle(
    userId: string,
    title?: string,
    excludeId?: string,
  ) {
    if (!title) {
      return;
    }

    const existingGallary = await this.gallaryModel.findOne({
      userId: this.toObjectId(userId, 'business owner id'),
      title,
      ...(excludeId
        ? { _id: { $ne: this.toObjectId(excludeId, 'gallary id') } }
        : {}),
    });

    if (existingGallary) {
      throw new HttpException(
        'A gallary item with this title already exists',
        400,
      );
    }
  }

  private async getOwnedGallaryOrThrow(gallaryId: string, userId: string) {
    const gallary = await this.gallaryModel.findOne({
      _id: this.toObjectId(gallaryId, 'gallary id'),
      userId: this.toObjectId(userId, 'business owner id'),
    });

    if (!gallary) {
      throw new HttpException('Gallary item not found', 404);
    }

    return gallary;
  }

  private async uploadImages(files?: Express.Multer.File[]) {
    if (!files?.length) {
      return [];
    }

    const uploads = await Promise.all(
      files.map((file) => fileUpload.uploadToCloudinary(file)),
    );

    return uploads.map<GallaryImage>((file) => ({
      url: file.url,
      publicId: file.public_id,
    }));
  }

  private async deleteImages(images: GallaryImage[]) {
    await Promise.all(
      images
        .map((image) => image.publicId)
        .filter(Boolean)
        .map((publicId) => fileUpload.deleteFromCloudinary(publicId!)),
    );
  }

  private async getGallariesByOwner(
    ownerId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      gallarySearchAbleFields,
      {
        userId: this.toObjectId(ownerId, 'business owner id'),
      },
    );

    const total = await this.gallaryModel.countDocuments(whereConditions);
    const gallaries = await this.gallaryModel
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
      data: gallaries,
    };
  }

  async createGallary(
    userId: string,
    createGallaryDto: CreateGallaryDto,
    imageFiles?: Express.Multer.File[],
  ) {
    const payload = this.normalizePayload(createGallaryDto);
    await this.ensureUniqueTitle(userId, payload.title);

    const images = await this.uploadImages(imageFiles);

    return this.gallaryModel.create({
      userId: this.toObjectId(userId, 'business owner id'),
      title: payload.title,
      images,
    });
  }

  async getMyGallaries(
    userId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    return this.getGallariesByOwner(userId, params, options);
  }

  async getOwnGallaryById(gallaryId: string, userId: string) {
    return this.getOwnedGallaryOrThrow(gallaryId, userId);
  }

  async getPublicGallariesByOwner(
    ownerId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    await this.ensurePublicBusinessOwnerExists(ownerId);

    return this.getGallariesByOwner(ownerId, params, options);
  }

  async getAllPublicGallaries(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      gallarySearchAbleFields,
    );

    const total = await this.gallaryModel.countDocuments(whereConditions);
    const gallaries = await this.gallaryModel
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
      data: gallaries,
    };
  }

  async updateOwnGallary(
    gallaryId: string,
    userId: string,
    updateGallaryDto: UpdateGallaryDto,
    imageFiles?: Express.Multer.File[],
  ) {
    const gallary = await this.getOwnedGallaryOrThrow(gallaryId, userId);
    const payload = this.normalizePayload(updateGallaryDto);

    await this.ensureUniqueTitle(userId, payload.title, gallaryId);

    let nextImages = [...gallary.images];

    if (payload.removeImagePublicIds?.length) {
      const removeSet = new Set(payload.removeImagePublicIds);
      const imagesToDelete = nextImages.filter(
        (image) => image.publicId && removeSet.has(image.publicId),
      );

      await this.deleteImages(imagesToDelete);
      nextImages = nextImages.filter(
        (image) => !image.publicId || !removeSet.has(image.publicId),
      );
    }

    if (imageFiles?.length) {
      const uploadedImages = await this.uploadImages(imageFiles);
      nextImages = [...nextImages, ...uploadedImages];
    }

    const updatedGallary = await this.gallaryModel.findByIdAndUpdate(
      gallary._id,
      {
        ...(payload.title ? { title: payload.title } : {}),
        images: nextImages,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    return updatedGallary;
  }

  async deleteOwnGallary(gallaryId: string, userId: string) {
    const gallary = await this.getOwnedGallaryOrThrow(gallaryId, userId);

    await this.deleteImages(gallary.images);
    await this.gallaryModel.findByIdAndDelete(gallary._id);

    return gallary;
  }
}
