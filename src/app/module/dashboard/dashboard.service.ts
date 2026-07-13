import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/app/module/user/entities/user.entity';
import { Report, ReportDocument } from 'src/app/module/report/entities/report.entity';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const reportPopulateFields = [
  { path: 'userId', select: 'firstName lastName email phoneNumber' },
  { path: 'serviceId', select: 'title description logo' },
  { path: 'ownerId', select: 'firstName lastName businessName email phoneNumber' },
];

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
  ) {}

  async getCards() {
    const [totalBusinesses, pendingApprovals, activeUsers, totalReports] =
      await Promise.all([
        this.userModel.countDocuments({ role: 'businessOwner' }),
        this.userModel.countDocuments({
          role: 'businessOwner',
          status: 'pending',
        }),
        this.userModel.countDocuments({ status: 'active' }),
        this.reportModel.countDocuments(),
      ]);

    return {
      totalBusinesses,
      pendingApprovals,
      activeUsers,
      totalReports,
    };
  }

 async getMonthlyRegistrations(year?: number) {
    let rangeStart: Date;

    if (year) {
      rangeStart = new Date(year, 0, 1);
      rangeStart.setHours(0, 0, 0, 0);
    } else {
      rangeStart = new Date();
      rangeStart.setMonth(rangeStart.getMonth() - 11);
      rangeStart.setDate(1);
      rangeStart.setHours(0, 0, 0, 0);
    }

    const rangeEnd = year
      ? new Date(year, 11, 31, 23, 59, 59, 999)
      : new Date();

    const raw = await this.userModel.aggregate([
      { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const series: { month: string; year: number; count: number }[] = [];
    const cursor = new Date(rangeStart);
    const monthsToBuild = 12;

    for (let i = 0; i < monthsToBuild; i++) {
      const currentYear = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      const found = raw.find(
        (r) => r._id.year === currentYear && r._id.month === month,
      );

      series.push({
        month: MONTH_NAMES[month - 1],
        year: currentYear,
        count: found ? found.count : 0,
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return series;
  }

  async getRecentActivity() {
    const [latestReports, newRegistrations] = await Promise.all([
      this.reportModel
        .find()
        .populate(reportPopulateFields)
        .sort({ createdAt: -1 })
        .limit(3),
      this.userModel
        .find({ role: 'businessOwner', status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(3)
        .select('firstName lastName businessName email status createdAt'),
    ]);

    return {
      latestReports,
      newRegistrations,
    };
  }
}