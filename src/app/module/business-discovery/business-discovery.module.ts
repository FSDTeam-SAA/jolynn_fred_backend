import { Module } from '@nestjs/common';
import { BusinessReferralModule } from '../business-referral/business-referral.module';
import { ServiceModule } from '../service/service.module';
import { BusinessDiscoveryController } from './business-discovery.controller';
import { BusinessDiscoveryService } from './business-discovery.service';

@Module({
  imports: [ServiceModule, BusinessReferralModule],
  controllers: [BusinessDiscoveryController],
  providers: [BusinessDiscoveryService],
})
export class BusinessDiscoveryModule {}
