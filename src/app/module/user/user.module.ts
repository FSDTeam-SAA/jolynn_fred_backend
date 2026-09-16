import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.entity';
import {
  BusinessService,
  BusinessServiceSchema,
} from '../service/entities/service.entity';
import { Review, ReviewSchema } from '../reviews/entities/review.entity';
import { Gallary, GallarySchema } from '../gallary/entities/gallary.entity';
import {
  ServiceCategory,
  ServiceCategorySchema,
} from '../service-category/entities/service-category.entity';
import { Qoute, QouteSchema } from '../qoute/entities/qoute.entity';
import {
  SaveQuote,
  SaveQuoteSchema,
} from '../save-quote/entities/save-quote.entity';
import { Report, ReportSchema } from '../report/entities/report.entity';
import {
  QouteReply,
  QouteReplySchema,
} from '../qoute/entities/qoute-reply.entity';
import {
  Conversation,
  ConversationSchema,
} from '../message/entities/conversation.entity';
import { Message, MessageSchema } from '../message/entities/message.entity';
import {
  HelpWanted,
  HelpWantedSchema,
} from '../help-wanted/entities/help-wanted.entity';
import {
  JobReport,
  JobReportSchema,
} from '../job-report/entities/job-report.entity';
import {
  SubCategory,
  SubCategorySchema,
} from '../sub-category/entities/sub-category.entity';
import { Contact, ContactSchema } from '../contact/entities/contact.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: BusinessService.name, schema: BusinessServiceSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Gallary.name, schema: GallarySchema },
      { name: ServiceCategory.name, schema: ServiceCategorySchema },
      { name: Qoute.name, schema: QouteSchema },
      { name: SaveQuote.name, schema: SaveQuoteSchema },
      { name: Report.name, schema: ReportSchema },
      { name: QouteReply.name, schema: QouteReplySchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: HelpWanted.name, schema: HelpWantedSchema },
      { name: JobReport.name, schema: JobReportSchema },
      { name: SubCategory.name, schema: SubCategorySchema },
      { name: Contact.name, schema: ContactSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
