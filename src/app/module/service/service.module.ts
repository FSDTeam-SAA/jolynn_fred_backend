import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import {
  BusinessService,
  BusinessServiceSchema,
} from './entities/service.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BusinessService.name, schema: BusinessServiceSchema },
    ]),
  ],
  controllers: [ServiceController],
  providers: [ServiceService],
  exports: [ServiceService],
})
export class ServiceModule {}
