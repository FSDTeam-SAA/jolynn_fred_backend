jest.mock('./entities/job-report.entity', () => ({
  JobReport: class JobReport {},
}));
jest.mock('src/app/module/help-wanted/entities/help-wanted.entity', () => ({
  HelpWanted: class HelpWanted {},
}));
jest.mock('src/app/helpers/sendMailer', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

import { Types } from 'mongoose';
import { JobReportService } from './job-report.service';

describe('JobReportService', () => {
  it('marks the reported job post as reported', async () => {
    const postId = new Types.ObjectId();
    const post = {
      _id: postId,
      userId: new Types.ObjectId(),
      username: 'poster',
      email: 'poster@example.com',
    };
    const createdReport = { _id: new Types.ObjectId() };
    const jobReportModel = {
      create: jest.fn().mockResolvedValue(createdReport),
    };
    const helpWantedModel = {
      findById: jest.fn().mockResolvedValue(post),
      findByIdAndUpdate: jest.fn().mockResolvedValue(post),
    };
    const userModel = {
      findByIdAndUpdate: jest.fn().mockResolvedValue({}),
    };
    const service = new JobReportService(
      jobReportModel as any,
      helpWantedModel as any,
      userModel as any,
    );

    await expect(
      service.createJobReport(new Types.ObjectId().toString(), {
        helpWantedId: postId.toString(),
        message: 'This job post is spam',
      }),
    ).resolves.toBe(createdReport);

    expect(helpWantedModel.findByIdAndUpdate).toHaveBeenCalledWith(postId, {
      $set: { isReported: true },
    });
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(post.userId, {
      $inc: { reportCount: 1 },
    });
  });

  it('marks a job report as read when an admin reviews its details', async () => {
    const reportId = new Types.ObjectId().toString();
    const reviewedReport = { _id: reportId, isRead: true };
    const populate = jest.fn().mockResolvedValue(reviewedReport);
    const jobReportModel = {
      findByIdAndUpdate: jest.fn().mockReturnValue({ populate }),
    };
    const service = new JobReportService(
      jobReportModel as any,
      {} as any,
      {} as any,
    );

    await expect(service.getSingleJobReport(reportId)).resolves.toBe(
      reviewedReport,
    );
    expect(jobReportModel.findByIdAndUpdate).toHaveBeenCalledWith(
      reportId,
      { $set: { isRead: true } },
      { new: true, runValidators: true },
    );
  });
});
