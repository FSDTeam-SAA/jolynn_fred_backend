import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobReportService } from './job-report.service';
import { JobReportController } from './job-report.controller';
import { JobReport, JobReportSchema } from './entities/job-report.entity';
import {
  HelpWanted,
  HelpWantedSchema,
} from 'src/app/module/help-wanted/entities/help-wanted.entity';
import { User, UserSchema } from 'src/app/module/user/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobReport.name, schema: JobReportSchema },
      { name: HelpWanted.name, schema: HelpWantedSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [JobReportController],
  providers: [JobReportService],
})
export class JobReportModule {}
