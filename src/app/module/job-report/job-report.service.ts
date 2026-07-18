import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateJobReportDto } from './dto/create-job-report.dto';
import { JobReport, JobReportDocument } from './entities/job-report.entity';
import { HelpWanted, HelpWantedDocument } from 'src/app/module/help-wanted/entities/help-wanted.entity';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

const jobReportSearchAbleFields = ['message'];

const populateFields = [
  {
    path: 'helpWantedId',
    select: 'username email zipcode category phone message',
  },
  {
    path: 'userId',
    select: 'firstName lastName email username phoneNumber profilePicture',
  },
];

@Injectable()
export class JobReportService {
  constructor(
    @InjectModel(JobReport.name)
    private readonly jobReportModel: Model<JobReportDocument>,
    @InjectModel(HelpWanted.name)
    private readonly helpWantedModel: Model<HelpWantedDocument>,
  ) {}

  async createJobReport(userId: string, createJobReportDto: CreateJobReportDto) {
    const post = await this.helpWantedModel.findById(
      createJobReportDto.helpWantedId,
    );
    if (!post) {
      throw new HttpException('Job post not found', 404);
    }

    const jobReport = await this.jobReportModel.create({
      ...createJobReportDto,
      userId,
    });
    return jobReport;
  }

  async getAllJobReport(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      jobReportSearchAbleFields,
    );

    const total = await this.jobReportModel.countDocuments(whereConditions);
    const jobReports = await this.jobReportModel
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
      data: jobReports,
    };
  }

  async getMyJobReport(userId: string, params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = {
      ...buildWhereConditions(params, jobReportSearchAbleFields),
      userId,
    };

    const total = await this.jobReportModel.countDocuments(whereConditions);
    const jobReports = await this.jobReportModel
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
      data: jobReports,
    };
  }

  async getSingleJobReport(id: string) {
    const jobReport = await this.jobReportModel
      .findById(id)
      .populate(populateFields);
    if (!jobReport) {
      throw new HttpException('Job report not found', 404);
    }
    return jobReport;
  }

  async deleteJobReport(id: string, requesterId: string) {
    const jobReport = await this.jobReportModel.findById(id);
    if (!jobReport) {
      throw new HttpException('Job report not found', 404);
    }

    if (jobReport.userId.toString() !== requesterId) {
      throw new HttpException(
        'You are not allowed to delete this report',
        403,
      );
    }

    const result = await this.jobReportModel.findByIdAndDelete(id);
    return result;
  }
}