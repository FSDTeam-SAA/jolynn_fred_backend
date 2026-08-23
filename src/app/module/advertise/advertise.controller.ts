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
import { AdvertiseService } from './advertise.service';
import { CreateAdvertiseDto } from './dto/create-advertise.dto';
import { UpdateAdvertiseDto } from './dto/update-advertise.dto';
import AuthGuard from 'src/app/middlewares/auth.guard';
import pick from 'src/app/helpers/pick';

@ApiTags('Advertise')
@Controller('advertise')
export class AdvertiseController {
  constructor(private readonly advertiseService: AdvertiseService) {}

  @Post()
  @ApiOperation({ summary: 'Submit an advertise request (public)' })
  @ApiBody({ type: CreateAdvertiseDto })
  @HttpCode(HttpStatus.CREATED)
  async createAdvertise(@Body() createAdvertiseDto: CreateAdvertiseDto) {
    const result =
      await this.advertiseService.createAdvertise(createAdvertiseDto);
    return {
      message: 'Advertise request submitted successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all advertise requests (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by name, email, phone or message',
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
  async getAllAdvertise(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.advertiseService.getAllAdvertise(params, options);

    return {
      message: 'Advertise fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single advertise request by id (admin only)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Advertise id',
  })
  @HttpCode(HttpStatus.OK)
  async getSingleAdvertise(@Param('id') id: string) {
    const result = await this.advertiseService.getSingleAdvertise(id);
    return {
      message: 'Advertise fetched successfully',
      data: result,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update advertise request by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiBody({ type: UpdateAdvertiseDto })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Advertise id',
  })
  @HttpCode(HttpStatus.OK)
  async updateAdvertise(
    @Param('id') id: string,
    @Body() updateAdvertiseDto: UpdateAdvertiseDto,
  ) {
    const result = await this.advertiseService.updateAdvertise(
      id,
      updateAdvertiseDto,
    );
    return {
      message: 'Advertise updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete advertise request by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Advertise id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteAdvertise(@Param('id') id: string) {
    const result = await this.advertiseService.deleteAdvertise(id);
    return {
      message: 'Advertise deleted successfully',
      data: result,
    };
  }
}
