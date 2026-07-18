import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GallaryController } from './gallary.controller';
import { GallaryService } from './gallary.service';
import { Gallary, GallarySchema } from './entities/gallary.entity';
import { User, UserSchema } from '../user/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Gallary.name, schema: GallarySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [GallaryController],
  providers: [GallaryService],
  exports: [GallaryService],
})
export class GallaryModule {}
