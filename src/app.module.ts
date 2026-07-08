import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import config from './app/config';
import { AuthModule } from './app/module/auth/auth.module';
import { UserModule } from './app/module/user/user.module';
import { FaqModule } from './app/module/faq/faq.module';
import { SponsorModule } from './app/module/sponsor/sponsor.module';
import { ContactModule } from './app/module/contact/contact.module';
import { AdvertiseModule } from './app/module/advertise/advertise.module';  
import { HelpWantedModule } from './app/module/help-wanted/help-wanted.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(config.mongoUri as string),
    AuthModule,
    UserModule,
    SponsorModule,
    FaqModule,
    ContactModule,
    AdvertiseModule,
    HelpWantedModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
