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
import { CreateQouteDto } from './dto/create-qoute.dto';
import { UpdateQouteDto } from './dto/update-qoute.dto';
import { ReplyQouteDto } from './dto/reply-qoute.dto';
import { QouteService } from './qoute.service';

@ApiTags('Qoute')
@Controller('qoute')
export class QouteController {
  constructor(private readonly qouteService: QouteService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a qoute request as a logged in user' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @ApiBody({ type: CreateQouteDto })
  @HttpCode(HttpStatus.CREATED)
  async createQoute(
    @Req() req: Request,
    @Body() createQouteDto: CreateQouteDto,
  ) {
    const result = await this.qouteService.createMyQoute(
      req.user!.id,
      createQouteDto,
    );

    return {
      message: 'Qoute request submitted successfully',
      data: result,
    };
  }

  @Post('my')
  @ApiOperation({
    summary: 'Submit a qoute request for the logged in user dashboard',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @ApiBody({ type: CreateQouteDto })
  @HttpCode(HttpStatus.CREATED)
  async createMyQoute(
    @Req() req: Request,
    @Body() createQouteDto: CreateQouteDto,
  ) {
    const result = await this.qouteService.createMyQoute(
      req.user!.id,
      createQouteDto,
    );

    return {
      message: 'Qoute request submitted successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all qoute requests (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description:
      'Search by name, email, phone number, service needed, project details or status',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    example: 'pending',
    description: 'Filter by qoute status',
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
  async getAllQoute(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm', 'status']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.qouteService.getAllQoute(params, options);

    return {
      message: 'Qoute requests fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('my')
  @ApiOperation({
    summary: 'Get all qoute requests created by the logged in user',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    example: 'pending',
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
  async getMyUserQoutes(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm', 'status']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.qouteService.getMyUserQoutes(
      req.user!.id,
      params,
      options,
    );

    return {
      message: 'User qoute requests fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('my-business')
  @ApiOperation({
    summary: 'Get qoute requests received by the logged in business owner',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner'))
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    example: 'pending',
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
  async getMyBusinessQoutes(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm', 'status']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.qouteService.getMyBusinessQoutes(
      req.user!.id,
      params,
      options,
    );

    return {
      message: 'Business qoute requests fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('my-business/:id')
  @ApiOperation({
    summary: 'Get a single qoute request for the logged in business owner',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Qoute id',
  })
  @HttpCode(HttpStatus.OK)
  async getMyBusinessSingleQoute(@Param('id') id: string, @Req() req: Request) {
    const result = await this.qouteService.getMyBusinessSingleQoute(
      id,
      req.user!.id,
    );

    return {
      message: 'Qoute request fetched successfully',
      data: result,
    };
  }

  @Get('my/:id')
  @ApiOperation({
    summary: 'Get a single qoute request created by the logged in user',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Qoute id',
  })
  @HttpCode(HttpStatus.OK)
  async getMyUserSingleQoute(@Param('id') id: string, @Req() req: Request) {
    const result = await this.qouteService.getMyUserSingleQoute(
      id,
      req.user!.id,
    );

    return {
      message: 'Qoute request fetched successfully',
      data: result,
    };
  }

  @Get('my-business/:id/replies')
  @ApiOperation({
    summary: 'Get internal replies for a received qoute request',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner'))
  @ApiParam({ name: 'id', type: String, description: 'Qoute id' })
  @HttpCode(HttpStatus.OK)
  async getMyBusinessQouteReplies(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const result = await this.qouteService.getMyBusinessQouteReplies(
      id,
      req.user!.id,
    );

    return {
      message: 'Qoute replies fetched successfully',
      data: result,
    };
  }

  @Get('my/:id/replies')
  @ApiOperation({ summary: 'Get internal replies for your qoute request' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @ApiParam({ name: 'id', type: String, description: 'Qoute id' })
  @HttpCode(HttpStatus.OK)
  async getMyUserQouteReplies(@Param('id') id: string, @Req() req: Request) {
    const result = await this.qouteService.getMyUserQouteReplies(
      id,
      req.user!.id,
    );

    return {
      message: 'Qoute replies fetched successfully',
      data: result,
    };
  }

  @Post('my-business/:id/reply')
  @ApiOperation({ summary: 'Reply to a received qoute request' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner'))
  @ApiParam({ name: 'id', type: String, description: 'Qoute id' })
  @ApiBody({ type: ReplyQouteDto })
  @HttpCode(HttpStatus.CREATED)
  async replyAsBusinessOwner(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() replyQouteDto: ReplyQouteDto,
  ) {
    const result = await this.qouteService.replyAsBusinessOwner(
      id,
      req.user!.id,
      replyQouteDto,
    );

    return {
      message: 'Qoute reply submitted successfully',
      data: result,
    };
  }

  @Post('my/:id/reply')
  @ApiOperation({ summary: 'Reply to the business owner about your qoute' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @ApiParam({ name: 'id', type: String, description: 'Qoute id' })
  @ApiBody({ type: ReplyQouteDto })
  @HttpCode(HttpStatus.CREATED)
  async replyAsUser(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() replyQouteDto: ReplyQouteDto,
  ) {
    const result = await this.qouteService.replyAsUser(
      id,
      req.user!.id,
      replyQouteDto,
    );

    return {
      message: 'Qoute reply submitted successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single qoute request by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Qoute id',
  })
  @HttpCode(HttpStatus.OK)
  async getSingleQoute(@Param('id') id: string) {
    const result = await this.qouteService.getSingleQoute(id);

    return {
      message: 'Qoute request fetched successfully',
      data: result,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update qoute request by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiBody({ type: UpdateQouteDto })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Qoute id',
  })
  @HttpCode(HttpStatus.OK)
  async updateQoute(
    @Param('id') id: string,
    @Body() updateQouteDto: UpdateQouteDto,
  ) {
    const result = await this.qouteService.updateQoute(id, updateQouteDto);

    return {
      message: 'Qoute request updated successfully',
      data: result,
    };
  }

  @Put('my-business/:id')
  @ApiOperation({
    summary:
      'Update qoute request status/details for the logged in business owner',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner'))
  @ApiBody({ type: UpdateQouteDto })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Qoute id',
  })
  @HttpCode(HttpStatus.OK)
  async updateMyBusinessQoute(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() updateQouteDto: UpdateQouteDto,
  ) {
    const result = await this.qouteService.updateMyBusinessQoute(
      id,
      req.user!.id,
      updateQouteDto,
    );

    return {
      message: 'Business qoute request updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete qoute request by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Qoute id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteQoute(@Param('id') id: string) {
    const result = await this.qouteService.deleteQoute(id);

    return {
      message: 'Qoute request deleted successfully',
      data: result,
    };
  }

  @Delete('my-business/:id')
  @ApiOperation({
    summary: 'Delete a qoute request received by the logged in business owner',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('businessOwner'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Qoute id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteMyBusinessQoute(@Param('id') id: string, @Req() req: Request) {
    const result = await this.qouteService.deleteMyBusinessQoute(
      id,
      req.user!.id,
    );

    return {
      message: 'Qoute request deleted successfully',
      data: result,
    };
  }

  @Delete('my/:id')
  @ApiOperation({
    summary: 'Delete a qoute request created by the logged in user',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    description: 'Qoute id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteMyUserQoute(@Param('id') id: string, @Req() req: Request) {
    const result = await this.qouteService.deleteMyUserQoute(id, req.user!.id);

    return {
      message: 'Qoute request deleted successfully',
      data: result,
    };
  }
}
