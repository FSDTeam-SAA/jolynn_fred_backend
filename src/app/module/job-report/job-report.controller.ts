import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
import { JobReportService } from './job-report.service';
import { CreateJobReportDto } from './dto/create-job-report.dto';
import AuthGuard from 'src/app/middlewares/auth.guard';
import pick from 'src/app/helpers/pick';

@ApiTags('Job Report')
@Controller('job-report')
export class JobReportController {
  constructor(private readonly jobReportService: JobReportService) {}

  @Post()
  @ApiOperation({ summary: 'Report a job post (logged-in user only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user', 'businessOwner', 'admin'))
  @ApiBody({ type: CreateJobReportDto })
  @HttpCode(HttpStatus.CREATED)
  async createJobReport(
    @Req() req: Request,
    @Body() createJobReportDto: CreateJobReportDto,
  ) {
    const result = await this.jobReportService.createJobReport(
      req.user!.id,
      createJobReportDto,
    );
    return {
      message: 'Job report submitted successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all job reports (public)' })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by message',
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
  async getAllJobReport(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.jobReportService.getAllJobReport(
      params,
      options,
    );

    return {
      message: 'Job report fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my own job reports (logged-in user)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user', 'businessOwner', 'admin'))
  @ApiQuery({ name: 'searchTerm', required: false, type: String, example: '' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @HttpCode(HttpStatus.OK)
  async getMyJobReport(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.jobReportService.getMyJobReport(
      req.user!.id,
      params,
      options,
    );
    return {
      message: 'Your job reports fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single job report by id (public)' })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Job report id',
  })
  @HttpCode(HttpStatus.OK)
  async getSingleJobReport(@Param('id') id: string) {
    const result = await this.jobReportService.getSingleJobReport(id);
    return {
      message: 'Job report fetched successfully',
      data: result,
    };
  }

@Delete(':id')
  @ApiOperation({ summary: 'Delete job report by id (owner or admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user', 'businessOwner', 'admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Job report id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteJobReport(@Param('id') id: string, @Req() req: Request) {
    const result = await this.jobReportService.deleteJobReport(
      id,
      req.user!.id,
      req.user!.role,
    );
    return {
      message: 'Job report deleted successfully',
      data: result,
    };
  }
}