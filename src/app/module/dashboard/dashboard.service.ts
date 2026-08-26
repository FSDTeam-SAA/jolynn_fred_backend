import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  businessOwnerMembershipFilter,
  getBusinessProfile,
} from 'src/app/helpers/account-profile';
import { User, UserDocument } from 'src/app/module/user/entities/user.entity';
import {
  Report,
  ReportDocument,
} from 'src/app/module/report/entities/report.entity';
import {
  ServiceCategory,
  ServiceCategoryDocument,
} from 'src/app/module/service-category/entities/service-category.entity';
import {
  BusinessService,
  BusinessServiceDocument,
} from 'src/app/module/service/entities/service.entity';
import {
  Gallary,
  GallaryDocument,
} from 'src/app/module/gallary/entities/gallary.entity';
import {
  Review,
  ReviewDocument,
} from 'src/app/module/reviews/entities/review.entity';
import {
  Qoute,
  QouteDocument,
} from 'src/app/module/qoute/entities/qoute.entity';
import {
  SponsorVisit,
  SponsorVisitDocument,
} from 'src/app/module/sponsor/entities/sponsor-visit.entity';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const reportPopulateFields = [
  { path: 'userId', select: 'firstName lastName email phoneNumber' },
  { path: 'serviceId', select: 'title description logo' },
  {
    path: 'ownerId',
    select: 'firstName lastName businessName email phoneNumber',
  },
];

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
    @InjectModel(BusinessService.name)
    private readonly serviceModel: Model<BusinessServiceDocument>,
    @InjectModel(ServiceCategory.name)
    private readonly serviceCategoryModel: Model<ServiceCategoryDocument>,
    @InjectModel(Gallary.name)
    private readonly gallaryModel: Model<GallaryDocument>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Qoute.name)
    private readonly qouteModel: Model<QouteDocument>,
    @InjectModel(SponsorVisit.name)
    private readonly sponsorVisitModel: Model<SponsorVisitDocument>,
  ) {}

  private toObjectId(id: string, label = 'user id') {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, 400);
    }

    return new Types.ObjectId(id);
  }

  async getCards() {
    const [
      totalBusinesses,
      pendingApprovals,
      activeUsers,
      totalServiceCategory,
    ] = await Promise.all([
      this.userModel.countDocuments(businessOwnerMembershipFilter),
      this.userModel.countDocuments({
        $and: [
          businessOwnerMembershipFilter,
          {
            $or: [
              { 'businessProfile.status': 'pending' },
              { businessProfile: { $exists: false }, status: 'pending' },
            ],
          },
        ],
      }),
      this.userModel.countDocuments({
        $or: [
          { accountStatus: 'active' },
          { accountStatus: { $exists: false }, status: 'active' },
        ],
      }),
      this.serviceCategoryModel.countDocuments(),
    ]);

    return {
      totalBusinesses,
      pendingApprovals,
      activeUsers,
      totalServiceCategory,
    };
  }

  async businessDashboardOverview(businessOwnerId: string) {
    const ownerObjectId = this.toObjectId(businessOwnerId, 'business owner id');

    const [galleryImageAggregate, totalServices, totalReviews, totalQuotes] =
      await Promise.all([
        this.gallaryModel.aggregate([
          {
            $match: {
              userId: ownerObjectId,
            },
          },
          {
            $group: {
              _id: null,
              totalImages: {
                $sum: { $size: { $ifNull: ['$images', []] } },
              },
            },
          },
        ]),
        this.serviceModel.countDocuments({ ownerId: ownerObjectId }),
        this.reviewModel.countDocuments({ businessId: ownerObjectId }),
        this.qouteModel.countDocuments({ businessOwnerId: ownerObjectId }),
      ]);

    return {
      galleryImages: galleryImageAggregate[0]?.totalImages ?? 0,
      totalServices,
      totalReviews,
      totalQuotes,
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

  async getMonthlySponsorVisits(year?: number) {
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

    const raw = await this.sponsorVisitModel.aggregate([
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
        (item) => item._id.year === currentYear && item._id.month === month,
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
        .find({
          $and: [
            businessOwnerMembershipFilter,
            {
              $or: [
                { 'businessProfile.status': 'pending' },
                { businessProfile: { $exists: false }, status: 'pending' },
              ],
            },
          ],
        })
        .sort({ createdAt: -1 })
        .limit(3)
        .select(
          'firstName lastName businessName email status businessProfile createdAt',
        ),
    ]);

    return {
      latestReports,
      newRegistrations: newRegistrations.map((user) => {
        const profile = getBusinessProfile(user);
        return {
          id: user.id,
          email: user.email,
          businessName: profile.businessName,
          ownerName: profile.ownerName,
          status: profile.status,
          createdAt: user.get('createdAt'),
        };
      }),
    };
  }
}
