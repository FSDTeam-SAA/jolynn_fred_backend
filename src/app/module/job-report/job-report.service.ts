import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateJobReportDto } from './dto/create-job-report.dto';
import { JobReport, JobReportDocument } from './entities/job-report.entity';
import {
  HelpWanted,
  HelpWantedDocument,
} from 'src/app/module/help-wanted/entities/help-wanted.entity';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

import sendMailer from 'src/app/helpers/sendMailer';
import { createNotificationEmailTemplate } from 'src/app/helpers/template';
import config from 'src/app/config';
const jobReportSearchAbleFields = ['message'];

const populateFields = [
  {
    path: 'helpWantedId',
    select: 'username email zipcode category budgetRange phone message',
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

  async createJobReport(
    userId: string,
    createJobReportDto: CreateJobReportDto,
  ) {
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

    if (config.email.admin) {
      sendMailer(
        config.email.admin,
        'New Job Post Report Submitted',
        createNotificationEmailTemplate({
          heading: 'New Job Post Report',
          subheading: 'A job post has been reported.',
          introText:
            'A job post on the platform has been reported and needs your review.',
          details: [
            { label: 'Reported Post By', value: post.username },
            { label: 'Post Email', value: post.email },
            { label: 'Message', value: createJobReportDto.message },
          ],
        }),
      ).catch((err) =>
        console.error('Failed to send admin job report email:', err),
      );
    }

    if (post.email) {
      sendMailer(
        post.email,
        'Your Job Post Has Been Reported',
        createNotificationEmailTemplate({
          heading: 'Your Post Was Reported',
          greetingName: post.username,
          introText:
            'Your job post has been reported by another user. Please review the details below.',
          details: [{ label: 'Message', value: createJobReportDto.message }],
          noteTitle: 'What happens next?',
          noteText: 'Our team will review this report shortly.',
        }),
      ).catch((err) =>
        console.error('Failed to send reported user email:', err),
      );
    }

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

  async getMyJobReport(
    userId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
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

  async deleteJobReport(
    id: string,
    requesterId: string,
    requesterRole: string,
  ) {
    const jobReport = await this.jobReportModel.findById(id);
    if (!jobReport) {
      throw new HttpException('Job report not found', 404);
    }

    const isOwner = jobReport.userId.toString() === requesterId;
    const isAdmin = requesterRole === 'admin';

    if (!isOwner && !isAdmin) {
      throw new HttpException('You are not allowed to delete this report', 403);
    }

    const result = await this.jobReportModel.findByIdAndDelete(id);
    return result;
  }
}
