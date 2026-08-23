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
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import AuthGuard from 'src/app/middlewares/auth.guard';
import pick from 'src/app/helpers/pick';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create category (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiBody({ type: CreateCategoryDto })
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    const result = await this.categoryService.createCategory(createCategoryDto);
    return {
      message: 'Category created successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories (public)' })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by category name',
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
  async getAllCategory(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.categoryService.getAllCategory(params, options);

    return {
      message: 'Category fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single category by id (public)' })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Category id',
  })
  @HttpCode(HttpStatus.OK)
  async getSingleCategory(@Param('id') id: string) {
    const result = await this.categoryService.getSingleCategory(id);
    return {
      message: 'Category fetched successfully',
      data: result,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiBody({ type: UpdateCategoryDto })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Category id',
  })
  @HttpCode(HttpStatus.OK)
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const result = await this.categoryService.updateCategory(
      id,
      updateCategoryDto,
    );
    return {
      message: 'Category updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Category id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteCategory(@Param('id') id: string) {
    const result = await this.categoryService.deleteCategory(id);
    return {
      message: 'Category deleted successfully',
      data: result,
    };
  }
}
