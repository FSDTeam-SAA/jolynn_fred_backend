import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  Patch,
  ParseFilePipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { fileUpload } from 'src/app/helpers/fileUploder';
import AuthGuard from 'src/app/middlewares/auth.guard';
import { BusinessReferralService } from './business-referral.service';
import { BUSINESS_REFERRAL_IMAGE_MAX_SIZE } from './constants/business-referral.constants';
import { CreateBusinessReferralDto } from './dto/create-business-referral.dto';
import { MyBusinessReferralsQueryDto } from './dto/my-business-referrals-query.dto';
import { SearchBusinessReferralsDto } from './dto/search-business-referrals.dto';
import { VerifyBusinessClaimTokenDto } from './dto/verify-business-claim-token.dto';
import { BusinessReferralNotificationService } from './business-referral-notification.service';
import { BusinessReferralClaimService } from './business-referral-claim.service';
import { CreateBusinessClaimDto } from './dto/create-business-claim.dto';
import { UpdateReferralEmailDto } from './dto/update-referral-email.dto';

@ApiTags('Business Referrals')
@Controller('business-referrals')
export class BusinessReferralController {
  constructor(
    private readonly businessReferralService: BusinessReferralService,
    private readonly notificationService: BusinessReferralNotificationService,
    private readonly claimService: BusinessReferralClaimService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Refer a business using a personal user profile' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateBusinessReferralDto })
  @UseGuards(AuthGuard('user'))
  @UseInterceptors(
    FileInterceptor('image', {
      ...fileUpload.uploadConfig,
      limits: { fileSize: BUSINESS_REFERRAL_IMAGE_MAX_SIZE },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async createReferral(
    @Req() req: Request,
    @Body() dto: CreateBusinessReferralDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: BUSINESS_REFERRAL_IMAGE_MAX_SIZE,
          }),
          new FileTypeValidator({ fileType: /^image\// }),
        ],
      }),
    )
    image: Express.Multer.File,
  ) {
    const result = await this.businessReferralService.createReferral(
      req.user!.id,
      dto,
      image,
    );

    return {
      message: 'Business referral submitted successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List published referred businesses' })
  @HttpCode(HttpStatus.OK)
  async getPublicReferrals(@Query() query: SearchBusinessReferralsDto) {
    const result = await this.businessReferralService.getPublicReferrals(query);

    return {
      message: 'Business referrals fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('mine')
  @ApiOperation({ summary: 'List referrals submitted by the logged-in user' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @HttpCode(HttpStatus.OK)
  async getMyReferrals(
    @Req() req: Request,
    @Query() query: MyBusinessReferralsQueryDto,
  ) {
    const result = await this.businessReferralService.getMyReferrals(
      req.user!.id,
      query,
    );

    return {
      message: 'Your business referrals fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('claims/verify')
  @ApiOperation({ summary: 'Validate a business claim email link' })
  @HttpCode(HttpStatus.OK)
  async verifyClaimToken(@Query() query: VerifyBusinessClaimTokenDto) {
    const result = await this.notificationService.verifyClaimToken(query.token);

    return {
      message: 'Claim link is valid',
      data: result,
    };
  }

  @Post(':id/notifications/resend')
  @ApiOperation({ summary: 'Resend the owner claim email for your referral' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'Business referral id' })
  @UseGuards(AuthGuard('user'))
  @HttpCode(HttpStatus.OK)
  async resendClaimNotification(@Param('id') id: string, @Req() req: Request) {
    const result = await this.notificationService.resendClaimNotification(
      id,
      req.user!.id,
    );

    return {
      message:
        result.emailDeliveryStatus === 'sent'
          ? 'Claim email sent successfully'
          : 'Claim email could not be delivered',
      data: result,
    };
  }

  @Patch(':id/contact-email')
  @ApiOperation({
    summary:
      'Correct an unclaimed referral email and send a replacement claim link',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'Business referral id' })
  @ApiBody({ type: UpdateReferralEmailDto })
  @UseGuards(AuthGuard('user'))
  @HttpCode(HttpStatus.OK)
  async updateReferralEmail(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: UpdateReferralEmailDto,
  ) {
    const result =
      await this.businessReferralService.updateUnclaimedReferralEmail(
        id,
        req.user!.id,
        dto,
      );

    return {
      message:
        result.emailDeliveryStatus === 'sent'
          ? 'Referral email corrected and claim link sent successfully'
          : 'Referral email corrected, but the claim email could not be delivered',
      data: result,
    };
  }

  @Post(':id/claims')
  @ApiOperation({ summary: 'Claim a referred business using its email token' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'Business referral id' })
  @ApiBody({ type: CreateBusinessClaimDto })
  @UseGuards(AuthGuard('user', 'businessOwner'))
  @HttpCode(HttpStatus.CREATED)
  async claimBusiness(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: CreateBusinessClaimDto,
  ) {
    const result = await this.claimService.claimBusiness(id, req.user!.id, dto);

    return {
      message: result.idempotent
        ? 'Business was already claimed by this account'
        : 'Business claimed successfully',
      data: result,
    };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published referred-business profile' })
  @ApiParam({ name: 'slug', example: 'acme-plumbing-austin-a1b2c3d4' })
  @HttpCode(HttpStatus.OK)
  async getPublicReferralBySlug(@Param('slug') slug: string) {
    const result =
      await this.businessReferralService.getPublicReferralBySlug(slug);

    return {
      message: 'Business referral fetched successfully',
      data: result,
    };
  }
}
