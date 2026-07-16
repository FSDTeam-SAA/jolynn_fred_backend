import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobReportService } from './job-report.service';
import { JobReportController } from './job-report.controller';
import { JobReport, JobReportSchema } from './entities/job-report.entity';
import { HelpWanted, HelpWantedSchema } from 'src/app/module/help-wanted/entities/help-wanted.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobReport.name, schema: JobReportSchema },
      { name: HelpWanted.name, schema: HelpWantedSchema },
    ]),
  ],
  controllers: [JobReportController],
  providers: [JobReportService],
})
export class JobReportModule {}