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
import { SponsorService } from './sponsor.service';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { UpdateSponsorDto } from './dto/update-sponsor.dto';
import { fileUpload } from 'src/app/helpers/fileUploder';
import AuthGuard from 'src/app/middlewares/auth.guard';
import pick from 'src/app/helpers/pick';

@ApiTags('Sponsor')
@Controller('sponsor')
export class SponsorController {
  constructor(private readonly sponsorService: SponsorService) {}

  @Post()
  @ApiOperation({ summary: 'Create sponsor (admin only)' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('admin'))
  @UseInterceptors(FileInterceptor('image', fileUpload.uploadConfig))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Our Gold Sponsor' },
        content: {
          type: 'string',
          example: 'This sponsor has supported us since 2020...',
        },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async createSponsor(
    @Body() createSponsorDto: CreateSponsorDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.sponsorService.createSponsor(
      createSponsorDto,
      file,
    );
    return {
      message: 'Sponsor created successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all sponsors (public)' })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by title or content',
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
  async getAllSponsor(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.sponsorService.getAllSponsor(params, options);

    return {
      message: 'Sponsor fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Record a sponsor view (public)' })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Sponsor id',
  })
  @HttpCode(HttpStatus.CREATED)
  async recordSponsorVisit(@Param('id') id: string) {
    const result = await this.sponsorService.recordSponsorVisit(id);

    return {
      message: 'Sponsor view recorded successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single sponsor by id (public)' })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Sponsor id',
  })
  @HttpCode(HttpStatus.OK)
  async getSingleSponsor(@Param('id') id: string) {
    const result = await this.sponsorService.getSingleSponsor(id);
    return {
      message: 'Sponsor fetched successfully',
      data: result,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update sponsor by id (admin only)' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('admin'))
  @UseInterceptors(FileInterceptor('image', fileUpload.uploadConfig))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: '' },
        content: { type: 'string', example: '' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Sponsor id',
  })
  @HttpCode(HttpStatus.OK)
  async updateSponsor(
    @Param('id') id: string,
    @Body() updateSponsorDto: UpdateSponsorDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.sponsorService.updateSponsor(
      id,
      updateSponsorDto,
      file,
    );
    return {
      message: 'Sponsor updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete sponsor by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Sponsor id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteSponsor(@Param('id') id: string) {
    const result = await this.sponsorService.deleteSponsor(id);
    return {
      message: 'Sponsor deleted successfully',
      data: result,
    };
  }
}
