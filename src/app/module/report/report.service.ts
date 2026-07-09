import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateReportDto } from './dto/create-report.dto';
import { Report, ReportDocument } from './entities/report.entity';
import {
  BusinessService,
  BusinessServiceDocument,
} from 'src/app/module/service/entities/service.entity';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

const reportSearchAbleFields = ['message'];

const populateFields = [
  { path: 'userId', select: 'firstName lastName email phoneNumber' },
  { path: 'serviceId', select: 'title description logo' },
  { path: 'ownerId', select: 'firstName lastName email phoneNumber' },
];

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
    @InjectModel(BusinessService.name)
    private readonly serviceModel: Model<BusinessServiceDocument>,
  ) {}

  async createReport(userId: string, createReportDto: CreateReportDto) {
    const service = await this.serviceModel.findById(
      createReportDto.serviceId,
    );
    if (!service) {
      throw new HttpException('Service not found', 404);
    }

    const report = await this.reportModel.create({
      userId,
      serviceId: createReportDto.serviceId,
      ownerId: service.ownerId,
      message: createReportDto.message,
    });

    return report;
  }

  async getAllReport(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      reportSearchAbleFields,
    );

    const total = await this.reportModel.countDocuments(whereConditions);
    const reports = await this.reportModel
      .find(whereConditions)
      .populate(populateFields)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any);

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: reports,
    };
  }

  async getSingleReport(id: string) {
    const report = await this.reportModel
      .findById(id)
      .populate(populateFields);
    if (!report) {
      throw new HttpException('Report not found', 404);
    }
    return report;
  }

  async deleteReport(id: string) {
    const report = await this.reportModel.findById(id);
    if (!report) {
      throw new HttpException('Report not found', 404);
    }
    const result = await this.reportModel.findByIdAndDelete(id);
    return result;
  }
}