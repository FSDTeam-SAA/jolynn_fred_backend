import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { fileUpload } from 'src/app/helpers/fileUploder';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import type { IFilterParams } from 'src/app/helpers/pick';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import {
  BusinessService,
  BusinessServiceDocument,
} from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

const serviceSearchAbleFields = ['title', 'description'];

@Injectable()
export class ServiceService {
  constructor(
    @InjectModel(BusinessService.name)
    private readonly serviceModel: Model<BusinessServiceDocument>,
  ) {}

  private normalizePayload<T extends CreateServiceDto | UpdateServiceDto>(
    payload: T,
  ) {
    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined && value !== ''),
    ) as T;
  }

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Invalid service reference', 400);
    }

    return new Types.ObjectId(id);
  }

  private async ensureUniqueTitle(
    ownerId: string,
    title?: string,
    excludeId?: string,
  ) {
    if (!title) {
      return;
    }

    const existingService = await this.serviceModel.findOne({
      ownerId: this.toObjectId(ownerId),
      title,
      ...(excludeId ? { _id: { $ne: this.toObjectId(excludeId) } } : {}),
    });

    if (existingService) {
      throw new HttpException('A service with this title already exists', 400);
    }
  }

  private async getOwnedServiceOrThrow(serviceId: string, ownerId: string) {
    const service = await this.serviceModel.findOne({
      _id: this.toObjectId(serviceId),
      ownerId: this.toObjectId(ownerId),
    });

    if (!service) {
      throw new HttpException('Service not found', 404);
    }

    return service;
  }

  async createService(
    ownerId: string,
    createServiceDto: CreateServiceDto,
    logoFile?: Express.Multer.File,
  ) {
    const payload = this.normalizePayload(createServiceDto);
    await this.ensureUniqueTitle(ownerId, payload.title);

    const servicePayload: Partial<BusinessService> = {
      ownerId: this.toObjectId(ownerId),
      title: payload.title,
      description: payload.description,
    };

    if (logoFile) {
      const uploadedLogo = await fileUpload.uploadToCloudinary(logoFile);
      servicePayload.logo = {
        url: uploadedLogo.url,
        publicId: uploadedLogo.public_id,
      };
    }

    return this.serviceModel.create(servicePayload);
  }

  async getMyServices(ownerId: string, params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(params, serviceSearchAbleFields, {
      ownerId: this.toObjectId(ownerId),
    });

    const total = await this.serviceModel.countDocuments(whereConditions);
    const services = await this.serviceModel
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
      data: services,
    };
  }

  async getOwnServiceById(serviceId: string, ownerId: string) {
    return this.getOwnedServiceOrThrow(serviceId, ownerId);
  }

  async getAllPublicServices(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      serviceSearchAbleFields,
    );

    const total = await this.serviceModel.countDocuments(whereConditions);
    const services = await this.serviceModel
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
      data: services,
    };
  }

  async updateOwnService(
    serviceId: string,
    ownerId: string,
    updateServiceDto: UpdateServiceDto,
    logoFile?: Express.Multer.File,
  ) {
    const service = await this.getOwnedServiceOrThrow(serviceId, ownerId);
    const payload = this.normalizePayload(updateServiceDto);

    await this.ensureUniqueTitle(ownerId, payload.title, serviceId);

    if (logoFile) {
      const uploadedLogo = await fileUpload.uploadToCloudinary(logoFile);

      if (service.logo?.publicId) {
        await fileUpload.deleteFromCloudinary(service.logo.publicId);
      }

      payload.logo = {
        url: uploadedLogo.url,
        publicId: uploadedLogo.public_id,
      } as any;
    }

    const updatedService = await this.serviceModel.findByIdAndUpdate(
      service._id,
      payload,
      { new: true, runValidators: true },
    );

    return updatedService;
  }

  async deleteOwnService(serviceId: string, ownerId: string) {
    const service = await this.getOwnedServiceOrThrow(serviceId, ownerId);

    if (service.logo?.publicId) {
      await fileUpload.deleteFromCloudinary(service.logo.publicId);
    }

    await this.serviceModel.findByIdAndDelete(service._id);

    return service;
  }
}
