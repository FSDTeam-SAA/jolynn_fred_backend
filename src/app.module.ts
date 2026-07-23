import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import config from './app/config';
import { AuthModule } from './app/module/auth/auth.module';
import { GallaryModule } from './app/module/gallary/gallary.module';
import { ReviewsModule } from './app/module/reviews/reviews.module';
import { UserModule } from './app/module/user/user.module';
import { FaqModule } from './app/module/faq/faq.module';
import { SponsorModule } from './app/module/sponsor/sponsor.module';
import { ContactModule } from './app/module/contact/contact.module';
import { AdvertiseModule } from './app/module/advertise/advertise.module';
import { HelpWantedModule } from './app/module/help-wanted/help-wanted.module';
import { QouteModule } from './app/module/qoute/qoute.module';
import { ServiceModule } from './app/module/service/service.module';
import { ReportModule } from './app/module/report/report.module';
import { LocationModule } from './app/module/location/location.module';
import { DashboardModule } from './app/module/dashboard/dashboard.module';
import { SaveQuoteModule } from './app/module/save-quote/save-quote.module';
import { JobReportModule } from './app/module/job-report/job-report.module';
import { CategoryModule } from './app/module/category/category.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(config.mongoUri as string),
    AuthModule,
    GallaryModule,
    ReviewsModule,
    UserModule,
    SponsorModule,
    FaqModule,
    ContactModule,
    AdvertiseModule,
    HelpWantedModule,
    QouteModule,
    ServiceModule,
    ReportModule,
    LocationModule,
    DashboardModule,
    SaveQuoteModule,
    JobReportModule,
    CategoryModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
