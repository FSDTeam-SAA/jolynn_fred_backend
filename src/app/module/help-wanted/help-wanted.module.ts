import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HelpWantedService } from './help-wanted.service';
import { HelpWantedController } from './help-wanted.controller';
import { HelpWanted, HelpWantedSchema } from './entities/help-wanted.entity';
import { User, UserSchema } from 'src/app/module/user/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HelpWanted.name, schema: HelpWantedSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [HelpWantedController],
  providers: [HelpWantedService],
})
export class HelpWantedModule {}