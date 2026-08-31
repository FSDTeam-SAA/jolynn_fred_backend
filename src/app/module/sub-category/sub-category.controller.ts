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
import pick from 'src/app/helpers/pick';
import AuthGuard from 'src/app/middlewares/auth.guard';
import { ActiveBusinessOwnerGuard } from 'src/app/middlewares/active-business-owner.guard';
import { CreateSubCategoriesDto } from './dto/create-sub-categories.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import { SubCategoryService } from './sub-category.service';

@ApiTags('Sub Category')
@Controller('sub-categories')
export class SubCategoryController {
  constructor(private readonly subCategoryService: SubCategoryService) {}

  @Post()
  @ApiOperation({
    summary: 'Create multiple subcategories under an owned service',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner', 'admin'), ActiveBusinessOwnerGuard)
  @ApiBody({ type: CreateSubCategoriesDto })
  @HttpCode(HttpStatus.CREATED)
  async createSubCategories(
    @Body() dto: CreateSubCategoriesDto,
    @Req() req: Request,
  ) {
    const result = await this.subCategoryService.createSubCategories(
      dto,
      req.user!.id,
      req.user!.role,
    );

    return {
      message: 'Subcategories created successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get subcategories' })
  @ApiQuery({ name: 'serviceId', required: false, type: String })
  @ApiQuery({ name: 'searchTerm', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
  })
  @HttpCode(HttpStatus.OK)
  async getAllSubCategories(@Req() req: Request) {
    const params = pick(req.query, ['serviceId', 'searchTerm']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.subCategoryService.getAllSubCategories(
      params,
      options,
    );

    return {
      message: 'Subcategories fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('my-sub-categories')
  @ApiOperation({
    summary: 'Get subcategories owned by the logged in business',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner', 'admin'))
  @ApiQuery({ name: 'serviceId', required: false, type: String })
  @ApiQuery({ name: 'searchTerm', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
  })
  @HttpCode(HttpStatus.OK)
  async getMySubCategories(@Req() req: Request) {
    const params = pick(req.query, ['serviceId', 'searchTerm']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.subCategoryService.getMySubCategories(
      req.user!.id,
      params,
      options,
    );

    return {
      message: 'Subcategories fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subcategory by id' })
  @ApiParam({ name: 'id', type: String })
  @HttpCode(HttpStatus.OK)
  async getSingleSubCategory(@Param('id') id: string) {
    const result = await this.subCategoryService.getSingleSubCategory(id);

    return {
      message: 'Subcategory fetched successfully',
      data: result,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a subcategory under an owned service' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner', 'admin'), ActiveBusinessOwnerGuard)
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateSubCategoryDto })
  @HttpCode(HttpStatus.OK)
  async updateSubCategory(
    @Param('id') id: string,
    @Body() dto: UpdateSubCategoryDto,
    @Req() req: Request,
  ) {
    const result = await this.subCategoryService.updateSubCategory(
      id,
      dto,
      req.user!.id,
      req.user!.role,
    );

    return {
      message: 'Subcategory updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subcategory from an owned service' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner', 'admin'), ActiveBusinessOwnerGuard)
  @ApiParam({ name: 'id', type: String })
  @HttpCode(HttpStatus.OK)
  async deleteSubCategory(@Param('id') id: string, @Req() req: Request) {
    const result = await this.subCategoryService.deleteSubCategory(
      id,
      req.user!.id,
      req.user!.role,
    );

    return {
      message: 'Subcategory deleted successfully',
      data: result,
    };
  }
}
