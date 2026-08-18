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
import { SearchDataService } from '../search-data/search-data.service';
import { CreateHelpWantedDto } from './dto/create-help-wanted.dto';
import { UpdateHelpWantedDto } from './dto/update-help-wanted.dto';
import AuthGuard from 'src/app/middlewares/auth.guard';
import pick from 'src/app/helpers/pick';
import { JwtService } from '@nestjs/jwt';
import config from 'src/app/config';
@ApiTags('Help Wanted')
@Controller('help-wanted')
export class HelpWantedController {
  constructor(
    private readonly helpWantedService: HelpWantedService,
    private readonly jwtService: JwtService,
    private readonly searchDataService: SearchDataService,
  ) {}

  private tryGetUserId(req: Request): string | undefined {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return undefined;

    try {
      const decoded = this.jwtService.verify<{ id: string }>(token, {
        secret: config.jwt.accessTokenSecret!,
      });
      return decoded?.id;
    } catch {
      return undefined;
    }
  }

  @Post()
  @ApiOperation({
    summary:
      'Submit a help wanted request (public, login optional to link post to your account)',
  })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: CreateHelpWantedDto })
  @HttpCode(HttpStatus.CREATED)
  async createHelpWanted(
    @Req() req: Request,
    @Body() createHelpWantedDto: CreateHelpWantedDto,
  ) {
    const userId = this.tryGetUserId(req);
    const result = await this.helpWantedService.createHelpWanted(
      createHelpWantedDto,
      userId,
    );
    return {
      message: 'Help wanted request submitted successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all help wanted requests (public)' })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    example: '',
    description:
      'Case-insensitive partial search across all help-wanted fields, related service-category fields, and the poster profile',
  })
  @ApiQuery({
    name: 'budgetRange',
    required: false,
    type: String,
    example: '$500 - $1,000',
    description: 'Filter by overlapping budget range',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    example: 'Plumbing',
    description: 'Case-insensitive exact category filter',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    example: 'Austin',
    description:
      'Case-insensitive partial regex city filter from the post or poster profile',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    type: String,
    example: 'Texas',
    description:
      'Case-insensitive partial regex state filter from the post or poster profile',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    type: String,
    example: 'Austin',
    description:
      'Case-insensitive partial location search across zipcode, city, state, country, address, and service area',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    example: 'active',
    description: 'Case-insensitive exact status filter',
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
    const params = pick(req.query, [
      'searchTerm',
      'budgetRange',
      'category',
      'city',
      'state',
      'location',
      'status',
    ]);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    await this.searchDataService.recordKeyword(params.searchTerm as string);
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

  @Get('my')
  @ApiOperation({ summary: 'Get my own help wanted posts (logged-in user)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user', 'businessOwner', 'admin'))
  @ApiQuery({ name: 'searchTerm', required: false, type: String, example: '' })
  @ApiQuery({
    name: 'budgetRange',
    required: false,
    type: String,
    example: '$500 - $1,000',
    description: 'Filter by overlapping budget range',
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
  async getMyHelpWanted(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm', 'budgetRange']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.helpWantedService.getMyHelpWanted(
      req.user!.id,
      params,
      options,
    );
    return {
      message: 'Your help wanted posts fetched successfully',
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
    summary: 'Delete help wanted request by id (owner or admin only)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user', 'businessOwner', 'admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Help wanted id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteHelpWanted(@Param('id') id: string, @Req() req: Request) {
    const result = await this.helpWantedService.deleteHelpWanted(
      id,
      req.user!.id,
      req.user!.role,
    );
    return {
      message: 'Help wanted deleted successfully',
      data: result,
    };
  }
}
