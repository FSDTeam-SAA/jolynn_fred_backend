import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubCategory, SubCategorySchema } from './entities/sub-category.entity';
import { SubCategoryController } from './sub-category.controller';
import { SubCategoryService } from './sub-category.service';
import { User, UserSchema } from '../user/entities/user.entity';
import {
  BusinessService,
  BusinessServiceSchema,
} from '../service/entities/service.entity';
import { ActiveBusinessOwnerGuard } from 'src/app/middlewares/active-business-owner.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubCategory.name, schema: SubCategorySchema },
      { name: User.name, schema: UserSchema },
      { name: BusinessService.name, schema: BusinessServiceSchema },
    ]),
  ],
  controllers: [SubCategoryController],
  providers: [SubCategoryService, ActiveBusinessOwnerGuard],
  exports: [SubCategoryService],
})
export class SubCategoryModule {}
