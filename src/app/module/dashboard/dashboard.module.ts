import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { User, UserSchema } from 'src/app/module/user/entities/user.entity';
import {
  Report,
  ReportSchema,
} from 'src/app/module/report/entities/report.entity';
import {
  BusinessService,
  BusinessServiceSchema,
} from 'src/app/module/service/entities/service.entity';
import {
  ServiceCategory,
  ServiceCategorySchema,
} from 'src/app/module/service-category/entities/service-category.entity';
import {
  Gallary,
  GallarySchema,
} from 'src/app/module/gallary/entities/gallary.entity';
import {
  Review,
  ReviewSchema,
} from 'src/app/module/reviews/entities/review.entity';
import { Qoute, QouteSchema } from 'src/app/module/qoute/entities/qoute.entity';
import {
  SponsorVisit,
  SponsorVisitSchema,
} from 'src/app/module/sponsor/entities/sponsor-visit.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Report.name, schema: ReportSchema },
      { name: BusinessService.name, schema: BusinessServiceSchema },
      {
        name: ServiceCategory.name,
        schema: ServiceCategorySchema,
      },
      { name: Gallary.name, schema: GallarySchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Qoute.name, schema: QouteSchema },
      { name: SponsorVisit.name, schema: SponsorVisitSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
