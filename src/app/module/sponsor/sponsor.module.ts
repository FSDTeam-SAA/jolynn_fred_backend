import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SponsorService } from './sponsor.service';
import { SponsorController } from './sponsor.controller';
import { Sponsor, SponsorSchema } from './entities/sponsor.entity';
import {
  SponsorVisit,
  SponsorVisitSchema,
} from './entities/sponsor-visit.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sponsor.name, schema: SponsorSchema },
      { name: SponsorVisit.name, schema: SponsorVisitSchema },
    ]),
  ],
  controllers: [SponsorController],
  providers: [SponsorService],
})
export class SponsorModule {}
