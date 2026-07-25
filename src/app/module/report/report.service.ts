import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateReportDto } from './dto/create-report.dto';
import { Report, ReportDocument } from './entities/report.entity';
import { User, UserDocument } from 'src/app/module/user/entities/user.entity';
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
  {
    path: 'ownerId',
    select: 'firstName lastName businessName email phoneNumber',
  },
];

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(BusinessService.name)
    private readonly serviceModel: Model<BusinessServiceDocument>,
  ) {}

  async createReport(userId: string, createReportDto: CreateReportDto) {
    const owner = await this.userModel.findOne({
      _id: createReportDto.ownerId,
      role: 'businessOwner',
    });
    if (!owner) {
      throw new HttpException('Business owner not found', 404);
    }

    const report = await this.reportModel.create({
      userId,
      ownerId: createReportDto.ownerId,
      message: createReportDto.message,
    });

    return report;
  }

  private async attachServices(reports: ReportDocument[]) {
    const ownerIds = [
      ...new Set(reports.map((report) => report.ownerId.toString())),
    ];

    const services = await this.serviceModel.find({
      ownerId: { $in: ownerIds },
    });

    return reports.map((report) => {
      const reportObj = report.toObject() as any;
      reportObj.services = services.filter(
        (service) => service.ownerId.toString() === report.ownerId.toString(),
      );
      return reportObj;
    });
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

    const data = await this.attachServices(reports);

    return {
      meta: {
        page,
        limit,
        total,
      },
      data,
    };
  }

  async getSingleReport(id: string) {
    const report = await this.reportModel
      .findById(id)
      .populate(populateFields);
    if (!report) {
      throw new HttpException('Report not found', 404);
    }

    const [enriched] = await this.attachServices([report]);
    return enriched;
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