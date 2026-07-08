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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
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
import { FileInterceptor } from '@nestjs/platform-express';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@ApiTags('Service')
@Controller('service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new service for the logged in business' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('businessOwner', 'admin'))
  @UseInterceptors(FileInterceptor('logo', fileUpload.uploadConfig))
  @ApiBody({ type: CreateServiceDto })
  @HttpCode(HttpStatus.CREATED)
  async createService(
    @Req() req: Request,
    @Body() createServiceDto: CreateServiceDto,
    @UploadedFile() logoFile?: Express.Multer.File,
  ) {
    const result = await this.serviceService.createService(
      req.user!.id,
      createServiceDto,
      logoFile,
    );

    return {
      message: 'Service created successfully',
      data: result,
    };
  }

  @Get('my-services')
  @ApiOperation({ summary: 'Get services owned by the logged in business' })
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by service title or description',
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
  async getMyServices(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm', 'title']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.serviceService.getMyServices(
      req.user!.id,
      params,
      options,
    );

    return {
      message: 'Services fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('my-services/:id')
  @ApiOperation({ summary: 'Get a single owned service by id' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner', 'admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Service id',
  })
  @HttpCode(HttpStatus.OK)
  async getOwnServiceById(@Param('id') id: string, @Req() req: Request) {
    const result = await this.serviceService.getOwnServiceById(id, req.user!.id);

    return {
      message: 'Service fetched successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all services publicly for all users with or without login',
  })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by service title or description',
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
  async getAllPublicServices(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm', 'title']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.serviceService.getAllPublicServices(
      params,
      options,
    );

    return {
      message: 'Services fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an owned service' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('businessOwner', 'admin'))
  @UseInterceptors(FileInterceptor('logo', fileUpload.uploadConfig))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Service id',
  })
  @ApiBody({ type: UpdateServiceDto })
  @HttpCode(HttpStatus.OK)
  async updateOwnService(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() updateServiceDto: UpdateServiceDto,
    @UploadedFile() logoFile?: Express.Multer.File,
  ) {
    const result = await this.serviceService.updateOwnService(
      id,
      req.user!.id,
      updateServiceDto,
      logoFile,
    );

    return {
      message: 'Service updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an owned service' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner', 'admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Service id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteOwnService(@Param('id') id: string, @Req() req: Request) {
    const result = await this.serviceService.deleteOwnService(id, req.user!.id);

    return {
      message: 'Service deleted successfully',
      data: result,
    };
  }
}
