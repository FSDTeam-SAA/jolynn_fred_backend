jest.mock('./entities/report.entity', () => ({
  Report: class Report {},
}));
jest.mock('src/app/module/user/entities/user.entity', () => ({
  User: class User {},
}));
jest.mock('src/app/module/service/entities/service.entity', () => ({
  BusinessService: class BusinessService {},
}));
jest.mock('src/app/helpers/sendMailer', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

import { Types } from 'mongoose';
import { ReportService } from './report.service';

describe('ReportService', () => {
  it('marks the reported business profile as reported', async () => {
    const ownerId = new Types.ObjectId();
    const owner = {
      _id: ownerId,
      email: 'owner@example.com',
      businessProfile: { businessName: 'Reported Business' },
    };
    const createdReport = { _id: new Types.ObjectId() };
    const reportModel = {
      create: jest.fn().mockResolvedValue(createdReport),
    };
    const userModel = {
      findOne: jest.fn().mockResolvedValue(owner),
      findByIdAndUpdate: jest.fn().mockResolvedValue(owner),
    };
    const service = new ReportService(
      reportModel as any,
      userModel as any,
      {} as any,
    );

    await expect(
      service.createReport(new Types.ObjectId().toString(), {
        ownerId: ownerId.toString(),
        message: 'Misleading business information',
      }),
    ).resolves.toBe(createdReport);

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(ownerId, {
      $set: { 'businessProfile.isReported': true },
      $inc: { reportCount: 1 },
    });
  });

  it('marks a business report as read when an admin reviews its details', async () => {
    const reportId = new Types.ObjectId().toString();
    const ownerId = new Types.ObjectId();
    const reviewedReport = {
      _id: reportId,
      ownerId,
      isRead: true,
      toObject: () => ({ _id: reportId, ownerId, isRead: true }),
    };
    const populate = jest.fn().mockResolvedValue(reviewedReport);
    const reportModel = {
      findByIdAndUpdate: jest.fn().mockReturnValue({ populate }),
    };
    const serviceModel = { find: jest.fn().mockResolvedValue([]) };
    const service = new ReportService(
      reportModel as any,
      {} as any,
      serviceModel as any,
    );

    await expect(service.getSingleReport(reportId)).resolves.toMatchObject({
      _id: reportId,
      isRead: true,
    });
    expect(reportModel.findByIdAndUpdate).toHaveBeenCalledWith(
      reportId,
      { $set: { isRead: true } },
      { new: true, runValidators: true },
    );
  });
});
