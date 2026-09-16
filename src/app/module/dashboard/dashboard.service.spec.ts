jest.mock('src/app/module/user/entities/user.entity', () => ({
  User: class User {},
}));
jest.mock('src/app/module/report/entities/report.entity', () => ({
  Report: class Report {},
}));
jest.mock('src/app/module/service/entities/service.entity', () => ({
  BusinessService: class BusinessService {},
}));
jest.mock('src/app/module/gallary/entities/gallary.entity', () => ({
  Gallary: class Gallary {},
}));
jest.mock('src/app/module/reviews/entities/review.entity', () => ({
  Review: class Review {},
}));
jest.mock('src/app/module/qoute/entities/qoute.entity', () => ({
  Qoute: class Qoute {},
}));
jest.mock('src/app/module/sponsor/entities/sponsor-visit.entity', () => ({
  SponsorVisit: class SponsorVisit {},
}));
jest.mock('src/app/module/job-report/entities/job-report.entity', () => ({
  JobReport: class JobReport {},
}));

import { DashboardService } from './dashboard.service';

describe('DashboardService cards', () => {
  it('returns the combined business and job report count', async () => {
    const userModel = {
      countDocuments: jest
        .fn()
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(9),
    };
    const reportModel = {
      countDocuments: jest
        .fn()
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2),
    };
    const jobReportModel = {
      countDocuments: jest
        .fn()
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(3),
    };
    const dashboardService = new DashboardService(
      userModel as any,
      reportModel as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      jobReportModel as any,
    );

    await expect(dashboardService.getCards()).resolves.toEqual({
      totalBusinesses: 12,
      pendingApprovals: 3,
      activeUsers: 9,
      totalReports: 12,
      unreadReports: 5,
      hasUnreadReports: true,
    });
    expect(reportModel.countDocuments).toHaveBeenCalledWith();
    expect(jobReportModel.countDocuments).toHaveBeenCalledWith();
    expect(reportModel.countDocuments).toHaveBeenCalledWith({
      isRead: { $ne: true },
    });
    expect(jobReportModel.countDocuments).toHaveBeenCalledWith({
      isRead: { $ne: true },
    });
  });
});
