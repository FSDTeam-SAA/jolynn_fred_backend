import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import AuthGuard from 'src/app/middlewares/auth.guard';
import { SendNewsletterDto } from './dto/send-newsletter.dto';
import { NewsletterService } from './newsletter.service';

@ApiTags('Newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('send')
  @ApiOperation({
    summary: 'Send a newsletter to all or selected active users (admin only)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiBody({ type: SendNewsletterDto })
  @HttpCode(HttpStatus.OK)
  async sendNewsletter(@Body() sendNewsletterDto: SendNewsletterDto) {
    const result =
      await this.newsletterService.sendNewsletter(sendNewsletterDto);

    return {
      message:
        result.failedDeliveries === 0
          ? 'Newsletter sent successfully'
          : 'Newsletter delivery completed with some failures',
      data: result,
    };
  }
}
