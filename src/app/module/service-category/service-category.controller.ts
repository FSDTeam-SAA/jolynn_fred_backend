import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { fileUpload } from 'src/app/helpers/fileUploder';
import pick from 'src/app/helpers/pick';
import AuthGuard from 'src/app/middlewares/auth.guard';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { RequestServiceCategoryDto } from './dto/request-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { UpdateServiceCategoryStatusDto } from './dto/update-service-category-status.dto';
import { ServiceCategoryService } from './service-category.service';

@ApiTags('Service Category')
@Controller('service-categories')
export class ServiceCategoryController {
  constructor(
    private readonly serviceCategoryService: ServiceCategoryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create service category (admin only)' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('admin'))
  @UseInterceptors(FileInterceptor('logo', fileUpload.uploadConfig))
  @ApiBody({ type: CreateServiceCategoryDto })
  @HttpCode(HttpStatus.CREATED)
  async createServiceCategory(
    @Body() createServiceCategoryDto: CreateServiceCategoryDto,
    @Req() req: Request,
    @UploadedFile() logoFile?: Express.Multer.File,
  ) {
    const result = await this.serviceCategoryService.createServiceCategory(
      createServiceCategoryDto,
      req.user?.id,
      logoFile,
    );

    return {
      message: 'Service category created successfully',
      data: result,
    };
  }

  @Post('request')
  @ApiOperation({ summary: 'Request a missing service category (public)' })
  @ApiBody({ type: RequestServiceCategoryDto })
  @HttpCode(HttpStatus.CREATED)
  async requestServiceCategory(
    @Body() requestServiceCategoryDto: RequestServiceCategoryDto,
  ) {
    const result = await this.serviceCategoryService.requestServiceCategory(
      requestServiceCategoryDto.name,
      requestServiceCategoryDto.source,
      requestServiceCategoryDto.requestedByUserId,
    );

    return {
      message: 'Service category request submitted successfully',
      data: result,
    };
  }

  @Get('public')
  @ApiOperation({ summary: 'Get approved active service categories (public)' })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by name, slug, description, status or source',
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
    example: 50,
    description: 'Items per page. Default is 10',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'sortOrder',
    description: 'Sort field. Default is createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'asc',
    description: 'Sort order. Default is desc',
  })
  @HttpCode(HttpStatus.OK)
  async getPublicServiceCategories(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.serviceCategoryService.getPublicServiceCategories(
      params,
      options,
    );

    return {
      message: 'Service categories fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all service categories (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by name, slug, description, status or source',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'rejected'],
    example: 'pending',
  })
  @ApiQuery({
    name: 'source',
    required: false,
    enum: ['admin', 'help_wanted', 'business_registration', 'service_creation'],
    example: 'help_wanted',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    example: true,
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
  async getAllServiceCategories(@Req() req: Request) {
    const params = pick(req.query, [
      'searchTerm',
      'status',
      'source',
      'isActive',
    ]);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.serviceCategoryService.getAllServiceCategories(
      params,
      options,
    );

    return {
      message: 'Service categories fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single service category by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Service category id',
  })
  @HttpCode(HttpStatus.OK)
  async getSingleServiceCategory(@Param('id') id: string) {
    const result =
      await this.serviceCategoryService.getSingleServiceCategory(id);

    return {
      message: 'Service category fetched successfully',
      data: result,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update service category by id (admin only)' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('admin'))
  @UseInterceptors(FileInterceptor('logo', fileUpload.uploadConfig))
  @ApiBody({ type: UpdateServiceCategoryDto })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Service category id',
  })
  @HttpCode(HttpStatus.OK)
  async updateServiceCategory(
    @Param('id') id: string,
    @Body() updateServiceCategoryDto: UpdateServiceCategoryDto,
    @UploadedFile() logoFile?: Express.Multer.File,
  ) {
    const result = await this.serviceCategoryService.updateServiceCategory(
      id,
      updateServiceCategoryDto,
      logoFile,
    );

    return {
      message: 'Service category updated successfully',
      data: result,
    };
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Approve or reject service category by id (admin only)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiBody({ type: UpdateServiceCategoryStatusDto })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Service category id',
  })
  @HttpCode(HttpStatus.OK)
  async updateServiceCategoryStatus(
    @Param('id') id: string,
    @Body() updateServiceCategoryStatusDto: UpdateServiceCategoryStatusDto,
    @Req() req: Request,
  ) {
    const result =
      await this.serviceCategoryService.updateServiceCategoryStatus(
        id,
        updateServiceCategoryStatusDto.status,
        req.user?.id,
        updateServiceCategoryStatusDto.rejectionReason,
      );

    return {
      message: `Service category ${updateServiceCategoryStatusDto.status} successfully`,
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete service category by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Service category id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteServiceCategory(@Param('id') id: string) {
    const result = await this.serviceCategoryService.deleteServiceCategory(id);

    return {
      message: 'Service category deleted successfully',
      data: result,
    };
  }
}
