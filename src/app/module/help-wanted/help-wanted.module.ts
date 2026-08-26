import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HelpWantedService } from './help-wanted.service';
import { HelpWantedController } from './help-wanted.controller';
import { HelpWanted, HelpWantedSchema } from './entities/help-wanted.entity';
import { ServiceCategoryModule } from '../service-category/service-category.module';
import { User, UserSchema } from 'src/app/module/user/entities/user.entity';
import {
  ServiceCategory,
  ServiceCategorySchema,
} from '../service-category/entities/service-category.entity';
import { SearchDataModule } from '../search-data/search-data.module';
import {
  HelpWantedCounter,
  HelpWantedCounterSchema,
} from './entities/help-wanted-counter.entity';
  
@Module({
  imports: [
    SearchDataModule,
    ServiceCategoryModule,
    MongooseModule.forFeature([
      { name: HelpWanted.name, schema: HelpWantedSchema },
      { name: User.name, schema: UserSchema },
      { name: ServiceCategory.name, schema: ServiceCategorySchema },
      { name: HelpWantedCounter.name, schema: HelpWantedCounterSchema },
    ]),
  ],
  controllers: [HelpWantedController],
  providers: [HelpWantedService],
})
export class HelpWantedModule {}
