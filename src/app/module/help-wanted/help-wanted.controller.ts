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
import { HelpWantedService } from './help-wanted.service';
import { CreateHelpWantedDto } from './dto/create-help-wanted.dto';
import { UpdateHelpWantedDto } from './dto/update-help-wanted.dto';
import AuthGuard from 'src/app/middlewares/auth.guard';
import pick from 'src/app/helpers/pick';

@ApiTags('Help Wanted')
@Controller('help-wanted')
export class HelpWantedController {
  constructor(private readonly helpWantedService: HelpWantedService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a help wanted request (public)' })
  @ApiBody({ type: CreateHelpWantedDto })
  @HttpCode(HttpStatus.CREATED)
  async createHelpWanted(@Body() createHelpWantedDto: CreateHelpWantedDto) {
    const result = await this.helpWantedService.createHelpWanted(
      createHelpWantedDto,
    );
    return {
      message: 'Help wanted request submitted successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all help wanted requests (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by username, email, zipcode, category, phone or message',
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
  async getAllHelpWanted(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.helpWantedService.getAllHelpWanted(
      params,
      options,
    );

    return {
      message: 'Help wanted fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single help wanted request by id (admin only)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Help wanted id',
  })
  @HttpCode(HttpStatus.OK)
  async getSingleHelpWanted(@Param('id') id: string) {
    const result = await this.helpWantedService.getSingleHelpWanted(id);
    return {
      message: 'Help wanted fetched successfully',
      data: result,
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update help wanted request by id (admin only)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiBody({ type: UpdateHelpWantedDto })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Help wanted id',
  })
  @HttpCode(HttpStatus.OK)
  async updateHelpWanted(
    @Param('id') id: string,
    @Body() updateHelpWantedDto: UpdateHelpWantedDto,
  ) {
    const result = await this.helpWantedService.updateHelpWanted(
      id,
      updateHelpWantedDto,
    );
    return {
      message: 'Help wanted updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete help wanted request by id (admin only)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Help wanted id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteHelpWanted(@Param('id') id: string) {
    const result = await this.helpWantedService.deleteHelpWanted(id);
    return {
      message: 'Help wanted deleted successfully',
      data: result,
    };
  }
}