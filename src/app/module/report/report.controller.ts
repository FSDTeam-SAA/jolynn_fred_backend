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
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import AuthGuard from 'src/app/middlewares/auth.guard';
import pick from 'src/app/helpers/pick';

@ApiTags('Report')
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @ApiOperation({ summary: 'Report a service (logged-in user only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user', 'admin', 'businessOwner'))
  @ApiBody({ type: CreateReportDto })
  @HttpCode(HttpStatus.CREATED)
  async createReport(
    @Req() req: Request,
    @Body() createReportDto: CreateReportDto,
  ) {
    const userId = (req as any).user.id;
    const result = await this.reportService.createReport(
      userId,
      createReportDto,
    );
    return {
      message: 'Report submitted successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all reports (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
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
  async getAllReport(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.reportService.getAllReport(params, options);

    return {
      message: 'Report fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single report by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Report id',
  })
  @HttpCode(HttpStatus.OK)
  async getSingleReport(@Param('id') id: string) {
    const result = await this.reportService.getSingleReport(id);
    return {
      message: 'Report fetched successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete report by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Report id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteReport(@Param('id') id: string) {
    const result = await this.reportService.deleteReport(id);
    return {
      message: 'Report deleted successfully',
      data: result,
    };
  }
}
