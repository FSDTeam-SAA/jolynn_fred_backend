import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.entity';
import {
  BusinessService,
  BusinessServiceSchema,
} from '../service/entities/service.entity';
import { Review, ReviewSchema } from '../reviews/entities/review.entity';
import { Gallary, GallarySchema } from '../gallary/entities/gallary.entity';
import {
  ServiceCategory,
  ServiceCategorySchema,
} from '../service-category/entities/service-category.entity';
import { Qoute, QouteSchema } from '../qoute/entities/qoute.entity';
import {
  SaveQuote,
  SaveQuoteSchema,
} from '../save-quote/entities/save-quote.entity';
import { Report, ReportSchema } from '../report/entities/report.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: BusinessService.name, schema: BusinessServiceSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Gallary.name, schema: GallarySchema },
      { name: ServiceCategory.name, schema: ServiceCategorySchema },
      { name: Qoute.name, schema: QouteSchema },
      { name: SaveQuote.name, schema: SaveQuoteSchema },
      { name: Report.name, schema: ReportSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
