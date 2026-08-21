import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/entities/user.entity';
import { QouteController } from './qoute.controller';
import { QouteService } from './qoute.service';
import { Qoute, QouteSchema } from './entities/qoute.entity';
import { QouteReply, QouteReplySchema } from './entities/qoute-reply.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Qoute.name, schema: QouteSchema },
      { name: QouteReply.name, schema: QouteReplySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [QouteController],
  providers: [QouteService],
  exports: [QouteService],
})
export class QouteModule {}
