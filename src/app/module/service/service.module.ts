import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Review, ReviewSchema } from '../reviews/entities/review.entity';
import { User, UserSchema } from '../user/entities/user.entity';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import {
  BusinessService,
  BusinessServiceSchema,
} from './entities/service.entity';
import { ActiveBusinessOwnerGuard } from 'src/app/middlewares/active-business-owner.guard';
import { ServiceCategoryModule } from '../service-category/service-category.module';

@Module({
  imports: [
    ServiceCategoryModule,
    MongooseModule.forFeature([
      { name: BusinessService.name, schema: BusinessServiceSchema },
      { name: User.name, schema: UserSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
  ],
  controllers: [ServiceController],
  providers: [ServiceService, ActiveBusinessOwnerGuard],
  exports: [ServiceService],
})
export class ServiceModule {}
