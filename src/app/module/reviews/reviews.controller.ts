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
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a review for a business' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user', 'businessOwner', 'admin'))
  @ApiBody({ type: CreateReviewDto })
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @Req() req: Request,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    const result = await this.reviewsService.createReview(
      req.user!.id,
      createReviewDto,
    );

    return {
      message: 'Review submitted successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all reviews across all businesses (public)' })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by review message, reviewer name or business name',
  })
  @ApiQuery({
    name: 'rating',
    required: false,
    type: Number,
    example: 5,
    description: 'Filter by exact rating value',
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
  @HttpCode(HttpStatus.OK)
  async getAllReviews(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm', 'rating']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.reviewsService.getAllReviews(params, options);

    return {
      message: 'Reviews fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('business/:businessId')
  @ApiOperation({ summary: 'Get public reviews for a business profile' })
  @ApiParam({
    name: 'businessId',
    required: true,
    type: String,
    description: 'Business owner user id',
  })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description: 'Search by review message or reviewer name',
  })
  @ApiQuery({
    name: 'rating',
    required: false,
    type: Number,
    example: 5,
    description: 'Filter by exact rating value',
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
  @HttpCode(HttpStatus.OK)
  async getPublicBusinessReviews(
    @Param('businessId') businessId: string,
    @Req() req: Request,
  ) {
    const params = pick(req.query, ['searchTerm', 'rating']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.reviewsService.getPublicBusinessReviews(
      businessId,
      params,
      options,
    );

    return {
      message: 'Reviews fetched successfully',
      meta: result.meta,
      data: {
        summary: result.summary,
        reviews: result.data,
      },
    };
  }

  @Get('my-reviews')
  @ApiOperation({ summary: 'Get reviews submitted by the logged in user' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user', 'businessOwner', 'admin'))
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
  })
  @ApiQuery({
    name: 'rating',
    required: false,
    type: Number,
    example: 5,
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
  async getMyReviews(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm', 'rating']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.reviewsService.getMyReviews(
      req.user!.id,
      params,
      options,
    );

    return {
      message: 'My reviews fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('my-business')
  @ApiOperation({ summary: 'Get reviews received by the logged in business' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner'))
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
  })
  @ApiQuery({
    name: 'rating',
    required: false,
    type: Number,
    example: 5,
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
  async getMyBusinessReviews(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm', 'rating']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.reviewsService.getMyBusinessReviews(
      req.user!.id,
      params,
      options,
    );

    return {
      message: 'Business reviews fetched successfully',
      meta: result.meta,
      data: {
        summary: result.summary,
        reviews: result.data,
      },
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update your own review' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user', 'businessOwner', 'admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Review id',
  })
  @ApiBody({ type: UpdateReviewDto })
  @HttpCode(HttpStatus.OK)
  async updateOwnReview(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    const result = await this.reviewsService.updateOwnReview(
      id,
      req.user!.id,
      updateReviewDto,
    );

    return {
      message: 'Review updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete your own review' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user', 'businessOwner', 'admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Review id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteOwnReview(@Param('id') id: string, @Req() req: Request) {
    const result = await this.reviewsService.deleteOwnReview(id, req.user!.id);

    return {
      message: 'Review deleted successfully',
      data: result,
    };
  }

  @Put(':id/reply')
  @ApiOperation({ summary: 'Reply to a review as the business owner' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Review id',
  })
  @ApiBody({ type: ReplyReviewDto })
  @HttpCode(HttpStatus.OK)
  async replyToReview(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() replyReviewDto: ReplyReviewDto,
  ) {
    const result = await this.reviewsService.replyToReview(
      id,
      req.user!.id,
      replyReviewDto,
    );

    return {
      message: 'Reply submitted successfully',
      data: result,
    };
  }

  @Delete(':id/reply')
  @ApiOperation({ summary: 'Delete a reply from your business review' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Review id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteReply(@Param('id') id: string, @Req() req: Request) {
    const result = await this.reviewsService.deleteReply(id, req.user!.id);

    return {
      message: 'Reply removed successfully',
      data: result,
    };
  }
}
