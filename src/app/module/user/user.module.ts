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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: BusinessService.name, schema: BusinessServiceSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Gallary.name, schema: GallarySchema },
      { name: ServiceCategory.name, schema: ServiceCategorySchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
