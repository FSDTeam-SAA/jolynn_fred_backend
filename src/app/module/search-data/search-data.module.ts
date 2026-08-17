import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SearchData,
  SearchDataSchema,
} from './entities/search-data.entity';
import { SearchDataController } from './search-data.controller';
import { SearchDataService } from './search-data.service';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: SearchData.name, schema: SearchDataSchema },
    ]),
  ],
  controllers: [SearchDataController],
  providers: [SearchDataService],
  exports: [SearchDataService],
})
export class SearchDataModule {}
