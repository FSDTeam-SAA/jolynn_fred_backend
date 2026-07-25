import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HelpWantedService } from './help-wanted.service';
import { HelpWantedController } from './help-wanted.controller';
import { HelpWanted, HelpWantedSchema } from './entities/help-wanted.entity';
import { ServiceCategoryModule } from '../service-category/service-category.module';

@Module({
  imports: [
    ServiceCategoryModule,
    MongooseModule.forFeature([
      { name: HelpWanted.name, schema: HelpWantedSchema },
    ]),
  ],
  controllers: [HelpWantedController],
  providers: [HelpWantedService],
})
export class HelpWantedModule {}
