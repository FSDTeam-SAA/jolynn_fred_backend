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
import AuthGuard from 'src/app/middlewares/auth.guard';
import pick from 'src/app/helpers/pick';
import { BulkDeleteSearchDataDto } from './dto/bulk-delete-search-data.dto';
import { CreateSearchDataDto } from './dto/create-search-data.dto';
import { SearchDataService } from './search-data.service';

@ApiTags('Search Data')
@Controller('search-data')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('admin'))
export class SearchDataController {
  constructor(private readonly searchDataService: SearchDataService) {}

  @Get()
  @ApiOperation({ summary: 'Get all search data with optional keyword search' })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: 'plumbing',
    description: 'Search stored keywords',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
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
  @HttpCode(HttpStatus.OK)
  async getAll(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.searchDataService.getAllSearchData(
      params,
      options,
    );

    return {
      message: 'Search data fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Store a search keyword (admin only)' })
  @ApiBody({ type: CreateSearchDataDto })
  async create(@Body() dto: CreateSearchDataDto) {
    return {
      message: 'Search keyword stored successfully',
      data: await this.searchDataService.createSearchData(dto),
    };
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Bulk delete search data (admin only)' })
  @ApiBody({ type: BulkDeleteSearchDataDto })
  async bulkDelete(@Body() dto: BulkDeleteSearchDataDto) {
    return {
      message: 'Search data deleted successfully',
      data: await this.searchDataService.bulkDeleteSearchData(dto.ids),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete search data by id (admin only)' })
  @ApiParam({ name: 'id', type: String })
  async delete(@Param('id') id: string) {
    return {
      message: 'Search data deleted successfully',
      data: await this.searchDataService.deleteSearchData(id),
    };
  }
}
