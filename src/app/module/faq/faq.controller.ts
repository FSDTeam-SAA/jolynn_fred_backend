import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import AuthGuard from 'src/app/middlewares/auth.guard';
import pick from 'src/app/helpers/pick';

@ApiTags('Faq')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Post()
  @ApiOperation({ summary: 'Create FAQ (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiBody({ type: CreateFaqDto })
  @HttpCode(HttpStatus.CREATED)
  async createFaq(@Body() createFaqDto: CreateFaqDto) {
    const result = await this.faqService.createFaq(createFaqDto);
    return {
      message: 'FAQ created successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all FAQs (public)' })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by question or answer',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number. Default is 1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page. Default is 10',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt',
    description: 'Sort field. Default is createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Sort order. Default is desc',
  })
  @HttpCode(HttpStatus.OK)
  async getAllFaq(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.faqService.getAllFaq(params, options);

    return {
      message: 'FAQ fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single FAQ by id (public)' })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'FAQ id',
  })
  @HttpCode(HttpStatus.OK)
  async getSingleFaq(@Param('id') id: string) {
    const result = await this.faqService.getSingleFaq(id);
    return {
      message: 'FAQ fetched successfully',
      data: result,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update FAQ by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiBody({ type: UpdateFaqDto })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'FAQ id',
  })
  @HttpCode(HttpStatus.OK)
  async updateFaq(
    @Param('id') id: string,
    @Body() updateFaqDto: UpdateFaqDto,
  ) {
    const result = await this.faqService.updateFaq(id, updateFaqDto);
    return {
      message: 'FAQ updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete FAQ by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'FAQ id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteFaq(@Param('id') id: string) {
    const result = await this.faqService.deleteFaq(id);
    return {
      message: 'FAQ deleted successfully',
      data: result,
    };
  }
}