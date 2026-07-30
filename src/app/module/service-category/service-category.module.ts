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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServiceCategory.name, schema: ServiceCategorySchema },
      { name: BusinessService.name, schema: BusinessServiceSchema },
    ]),
  ],
  controllers: [ServiceCategoryController],
  providers: [ServiceCategoryService],
  exports: [ServiceCategoryService],
})
export class ServiceCategoryModule {}
