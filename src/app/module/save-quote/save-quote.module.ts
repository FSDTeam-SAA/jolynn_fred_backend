import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Review, ReviewSchema } from '../reviews/entities/review.entity';
import {
  BusinessService,
  BusinessServiceSchema,
} from '../service/entities/service.entity';
import { User, UserSchema } from '../user/entities/user.entity';
import { SaveQuoteController } from './save-quote.controller';
import { SaveQuoteService } from './save-quote.service';
import { SaveQuote, SaveQuoteSchema } from './entities/save-quote.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SaveQuote.name, schema: SaveQuoteSchema },
      { name: User.name, schema: UserSchema },
      { name: BusinessService.name, schema: BusinessServiceSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
  ],
  controllers: [SaveQuoteController],
  providers: [SaveQuoteService],
  exports: [SaveQuoteService],
})
export class SaveQuoteModule {}
