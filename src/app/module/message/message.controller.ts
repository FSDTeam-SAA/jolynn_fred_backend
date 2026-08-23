import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import pick from 'src/app/helpers/pick';
import { fileUpload } from 'src/app/helpers/fileUploder';
import AuthGuard from 'src/app/middlewares/auth.guard';
import {
  CreateMessageDto,
  MessageListQueryDto,
  ReplyMessageDto,
} from './dto/create-message.dto';
import { MessageService } from './message.service';

@ApiTags('Messages')
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @ApiOperation({
    summary: 'Start a platform-only conversation with a business owner',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateMessageDto })
  @UseInterceptors(FilesInterceptor('attachments', 10, fileUpload.uploadConfig))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: Request,
    @Body() dto: CreateMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return {
      message: 'Conversation started successfully',
      data: await this.messageService.createMessage(req.user!.id, dto, files),
    };
  }

  @Get('my')
  @ApiOperation({ summary: 'List conversations for the logged-in user' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listMy(@Req() req: Request) {
    return {
      message: 'User conversations fetched successfully',
      ...(await this.messageService.listConversations(
        req.user!.id,
        'user',
        pick(req.query, ['page', 'limit']),
      )),
    };
  }

  @Get('business')
  @ApiOperation({
    summary: 'List conversations for the logged-in business owner',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner'))
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listBusiness(@Req() req: Request) {
    return {
      message: 'Business conversations fetched successfully',
      ...(await this.messageService.listConversations(
        req.user!.id,
        'businessOwner',
        pick(req.query, ['page', 'limit']),
      )),
    };
  }

  @Get('my/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @ApiParam({ name: 'id', type: String })
  async getMy(@Param('id') id: string, @Req() req: Request) {
    return {
      message: 'Conversation fetched successfully',
      data: await this.messageService.getConversation(id, req.user!.id, 'user'),
    };
  }

  @Get('business/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner'))
  @ApiParam({ name: 'id', type: String })
  async getBusiness(@Param('id') id: string, @Req() req: Request) {
    return {
      message: 'Conversation fetched successfully',
      data: await this.messageService.getConversation(
        id,
        req.user!.id,
        'businessOwner',
      ),
    };
  }

  @Post('my/:id/reply')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ReplyMessageDto })
  @UseInterceptors(FilesInterceptor('attachments', 10, fileUpload.uploadConfig))
  async replyAsUser(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: ReplyMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return {
      message: 'Reply sent successfully',
      data: await this.messageService.replyToConversation(
        id,
        req.user!.id,
        'user',
        dto,
        files,
      ),
    };
  }

  @Post('business/:id/reply')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ReplyMessageDto })
  @UseInterceptors(FilesInterceptor('attachments', 10, fileUpload.uploadConfig))
  async replyAsBusiness(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: ReplyMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return {
      message: 'Reply sent successfully',
      data: await this.messageService.replyToConversation(
        id,
        req.user!.id,
        'businessOwner',
        dto,
        files,
      ),
    };
  }
}
