import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { Faq, FaqDocument } from './entities/faq.entity';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

const faqSearchAbleFields = ['question', 'answer'];

@Injectable()
export class FaqService {
  constructor(
    @InjectModel(Faq.name) private readonly faqModel: Model<FaqDocument>,
  ) {}

  async createFaq(createFaqDto: CreateFaqDto) {
    const faq = await this.faqModel.create(createFaqDto);
    return faq;
  }

  async getAllFaq(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(params, faqSearchAbleFields);

    const total = await this.faqModel.countDocuments(whereConditions);
    const faqs = await this.faqModel
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
      data: faqs,
    };
  }

  async getSingleFaq(id: string) {
    const faq = await this.faqModel.findById(id);
    if (!faq) {
      throw new HttpException('FAQ not found', 404);
    }
    return faq;
  }

  async updateFaq(id: string, updateFaqDto: UpdateFaqDto) {
    const faq = await this.faqModel.findById(id);
    if (!faq) {
      throw new HttpException('FAQ not found', 404);
    }

    const updatedFaq = await this.faqModel.findByIdAndUpdate(
      id,
      updateFaqDto,
      { new: true },
    );
    return updatedFaq;
  }

  async deleteFaq(id: string) {
    const faq = await this.faqModel.findById(id);
    if (!faq) {
      throw new HttpException('FAQ not found', 404);
    }
    const result = await this.faqModel.findByIdAndDelete(id);
    return result;
  }
}