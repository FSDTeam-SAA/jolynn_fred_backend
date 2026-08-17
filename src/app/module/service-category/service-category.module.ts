import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServiceCategoryController } from './service-category.controller';
import {
  ServiceCategory,
  ServiceCategorySchema,
} from './entities/service-category.entity';
import { ServiceCategoryService } from './service-category.service';
import {
  BusinessService,
  BusinessServiceSchema,
} from '../service/entities/service.entity';
import {
  HelpWanted,
  HelpWantedSchema,
} from '../help-wanted/entities/help-wanted.entity';
import { User, UserSchema } from '../user/entities/user.entity';
import { SearchDataModule } from '../search-data/search-data.module';

@Module({
  imports: [
    SearchDataModule,
    MongooseModule.forFeature([
      { name: ServiceCategory.name, schema: ServiceCategorySchema },
      { name: BusinessService.name, schema: BusinessServiceSchema },
      { name: HelpWanted.name, schema: HelpWantedSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ServiceCategoryController],
  providers: [ServiceCategoryService],
  exports: [ServiceCategoryService],
})
export class ServiceCategoryModule {}
