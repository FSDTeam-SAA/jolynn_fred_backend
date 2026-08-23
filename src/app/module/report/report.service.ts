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

import sendMailer from 'src/app/helpers/sendMailer';
import { createNotificationEmailTemplate } from 'src/app/helpers/template';
import config from 'src/app/config';
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

    const emailBody = `<p>A new report has been submitted.</p>
       <p><strong>Reported Business Owner:</strong> ${owner.firstName || ''} ${owner.lastName || ''} (${owner.email})</p>
       <p><strong>Message:</strong> ${createReportDto.message}</p>`;

    if (config.email.admin) {
      sendMailer(
        config.email.admin,
        'New Report Submitted',
        createNotificationEmailTemplate({
          heading: 'New Report Submitted',
          subheading: 'A user has reported a business owner.',
          introText: 'A new report has been submitted and needs your review.',
          details: [
            {
              label: 'Reported Business Owner',
              value: `${owner.firstName || ''} ${owner.lastName || ''}`,
            },
            { label: 'Owner Email', value: owner.email },
            { label: 'Message', value: createReportDto.message },
          ],
        }),
      ).catch((err) =>
        console.error('Failed to send admin report email:', err),
      );
    }

    if (owner.email) {
      sendMailer(
        owner.email,
        'You Have Been Reported',
        createNotificationEmailTemplate({
          heading: 'A Report Was Filed Against You',
          greetingName: owner.firstName || '',
          introText:
            'A user has submitted a report against your business account. Please review the details below.',
          details: [{ label: 'Message', value: createReportDto.message }],
          noteTitle: 'What happens next?',
          noteText:
            'Our team will review this report and may reach out to you for more information.',
        }),
      ).catch((err) =>
        console.error('Failed to send owner report email:', err),
      );
    }

    return report;
  }
  private getOwnerIdString(ownerId: any): string | null {
    if (!ownerId) return null;
    return typeof ownerId === 'object' && ownerId._id
      ? ownerId._id.toString()
      : ownerId.toString();
  }

  private async attachServices(reports: ReportDocument[]) {
    const ownerIds = [
      ...new Set(
        reports
          .map((report) => this.getOwnerIdString(report.ownerId))
          .filter((id): id is string => id !== null),
      ),
    ];

    const services = ownerIds.length
      ? await this.serviceModel.find({ ownerId: { $in: ownerIds } })
      : [];

    return reports.map((report) => {
      const reportObj = report.toObject() as any;
      const reportOwnerId = this.getOwnerIdString(report.ownerId);
      reportObj.services = reportOwnerId
        ? services.filter(
            (service) => service.ownerId.toString() === reportOwnerId,
          )
        : [];
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
    const report = await this.reportModel.findById(id).populate(populateFields);
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
