import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/entities/user.entity';
import { QouteController } from './qoute.controller';
import { QouteService } from './qoute.service';
import { Qoute, QouteSchema } from './entities/qoute.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Qoute.name, schema: QouteSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [QouteController],
  providers: [QouteService],
  exports: [QouteService],
})
export class QouteModule {}
