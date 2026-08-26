import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { ServiceCategoryModule } from '../service-category/service-category.module';
import {
  BusinessService,
  BusinessServiceSchema,
} from '../service/entities/service.entity';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([
      { name: BusinessService.name, schema: BusinessServiceSchema },
    ]),
    ServiceCategoryModule,
    JwtModule.register({
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule, AuthService, MongooseModule],
})
export class AuthModule {}
