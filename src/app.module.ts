import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import config from './app/config';
import { AuthModule } from './app/module/auth/auth.module';
import { GallaryModule } from './app/module/gallary/gallary.module';
import { UserModule } from './app/module/user/user.module';
import { ServiceModule } from './app/module/service/service.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(config.mongoUri as string),
    AuthModule,
    GallaryModule,
    UserModule,
    ServiceModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
