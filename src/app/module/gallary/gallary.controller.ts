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
import { CreateGallaryDto } from './dto/create-gallary.dto';
import { UpdateGallaryDto } from './dto/update-gallary.dto';
import { GallaryService } from './gallary.service';

@ApiTags('Gallary')
@Controller('gallary')
export class GallaryController {
  constructor(private readonly gallaryService: GallaryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new gallary item for the logged in business' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('businessOwner', 'admin'))
  @UseInterceptors(FilesInterceptor('images', 10, fileUpload.uploadConfig))
  @ApiBody({ type: CreateGallaryDto })
  @HttpCode(HttpStatus.CREATED)
  async createGallary(
    @Req() req: Request,
    @Body() createGallaryDto: CreateGallaryDto,
    @UploadedFiles() imageFiles?: Express.Multer.File[],
  ) {
    const result = await this.gallaryService.createGallary(
      req.user!.id,
      createGallaryDto,
      imageFiles,
    );

    return {
      message: 'Gallary item created successfully',
      data: result,
    };
  }

  @Get('my-gallaries')
  @ApiOperation({ summary: 'Get gallary items owned by the logged in business' })
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by gallary title',
  })
  @ApiQuery({
    name: 'title',
    required: false,
    type: String,
    example: '',
    description: 'Filter by exact title',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @UseGuards(AuthGuard('businessOwner', 'admin'))
  @HttpCode(HttpStatus.OK)
  async getMyGallaries(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm', 'title']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.gallaryService.getMyGallaries(
      req.user!.id,
      params,
      options,
    );

    return {
      message: 'Gallary items fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('my-gallaries/:id')
  @ApiOperation({ summary: 'Get a single owned gallary item by id' })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Gallary id',
  })
  @HttpCode(HttpStatus.OK)
  async getOwnGallaryById(@Param('id') id: string, @Req() req: Request) {
    const result = await this.gallaryService.getOwnGallaryById(
      id,
      req.user!.id,
    );

    return {
      message: 'Gallary item fetched successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all gallary items publicly for all users with or without login',
  })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by gallary title',
  })
  @ApiQuery({
    name: 'title',
    required: false,
    type: String,
    example: '',
    description: 'Filter by exact title',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
  })
  @HttpCode(HttpStatus.OK)
  async getAllPublicGallaries(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm', 'title']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.gallaryService.getAllPublicGallaries(
      params,
      options,
    );

    return {
      message: 'Gallary items fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an owned gallary item' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('businessOwner', 'admin'))
  @UseInterceptors(FilesInterceptor('images', 10, fileUpload.uploadConfig))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Gallary id',
  })
  @ApiBody({ type: UpdateGallaryDto })
  @HttpCode(HttpStatus.OK)
  async updateOwnGallary(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() updateGallaryDto: UpdateGallaryDto,
    @UploadedFiles() imageFiles?: Express.Multer.File[],
  ) {
    const result = await this.gallaryService.updateOwnGallary(
      id,
      req.user!.id,
      updateGallaryDto,
      imageFiles,
    );

    return {
      message: 'Gallary item updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an owned gallary item' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner', 'admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Gallary id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteOwnGallary(@Param('id') id: string, @Req() req: Request) {
    const result = await this.gallaryService.deleteOwnGallary(id, req.user!.id);

    return {
      message: 'Gallary item deleted successfully',
      data: result,
    };
  }
}
