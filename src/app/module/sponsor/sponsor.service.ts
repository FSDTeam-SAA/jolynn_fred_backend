import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { UpdateSponsorDto } from './dto/update-sponsor.dto';
import { Sponsor, SponsorDocument } from './entities/sponsor.entity';
import { fileUpload } from 'src/app/helpers/fileUploder';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

const sponsorSearchAbleFields = ['title', 'content'];

@Injectable()
export class SponsorService {
  constructor(
    @InjectModel(Sponsor.name)
    private readonly sponsorModel: Model<SponsorDocument>,
  ) {}

  async createSponsor(
    createSponsorDto: CreateSponsorDto,
    file?: Express.Multer.File,
  ) {
    const payload: Record<string, any> = { ...createSponsorDto };
    delete payload.image;

    if (file) {
      const uploaded = await fileUpload.uploadToCloudinary(file);
      payload.image = uploaded.url;
      payload.imagePublicId = uploaded.public_id;
    }

    const sponsor = await this.sponsorModel.create(payload);
    return sponsor;
  }

  async getAllSponsor(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      sponsorSearchAbleFields,
    );

    const total = await this.sponsorModel.countDocuments(whereConditions);
    const sponsors = await this.sponsorModel
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
      data: sponsors,
    };
  }

  async getSingleSponsor(id: string) {
    const sponsor = await this.sponsorModel.findById(id);
    if (!sponsor) {
      throw new HttpException('Sponsor not found', 404);
    }
    return sponsor;
  }

  async updateSponsor(
    id: string,
    updateSponsorDto: UpdateSponsorDto,
    file?: Express.Multer.File,
  ) {
    const sponsor = await this.sponsorModel.findById(id);
    if (!sponsor) {
      throw new HttpException('Sponsor not found', 404);
    }

    const payload: Record<string, any> = { ...updateSponsorDto };
    delete payload.image;

    if (file) {
      const uploaded = await fileUpload.uploadToCloudinary(file);
      payload.image = uploaded.url;
      payload.imagePublicId = uploaded.public_id;

      if (sponsor.imagePublicId) {
        await fileUpload.deleteFromCloudinary(sponsor.imagePublicId);
      }
    }

    const updatedSponsor = await this.sponsorModel.findByIdAndUpdate(
      id,
      payload,
      { new: true },
    );
    return updatedSponsor;
  }

  async deleteSponsor(id: string) {
    const sponsor = await this.sponsorModel.findById(id);
    if (!sponsor) {
      throw new HttpException('Sponsor not found', 404);
    }

    if (sponsor.imagePublicId) {
      await fileUpload.deleteFromCloudinary(sponsor.imagePublicId);
    }

    const result = await this.sponsorModel.findByIdAndDelete(id);
    return result;
  }
}