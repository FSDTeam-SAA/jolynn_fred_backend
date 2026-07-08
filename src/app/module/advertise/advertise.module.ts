import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdvertiseService } from './advertise.service';
import { AdvertiseController } from './advertise.controller';
import { Advertise, AdvertiseSchema } from './entities/advertise.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Advertise.name, schema: AdvertiseSchema },
    ]),
  ],
  controllers: [AdvertiseController],
  providers: [AdvertiseService],
})
export class AdvertiseModule {}