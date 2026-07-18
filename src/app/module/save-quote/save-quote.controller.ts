import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import pick from 'src/app/helpers/pick';
import AuthGuard from 'src/app/middlewares/auth.guard';
import { CreateSaveQuoteDto } from './dto/create-save-quote.dto';
import { SaveQuoteService } from './save-quote.service';

@ApiTags('Save Quote')
@Controller('save-quote')
export class SaveQuoteController {
  constructor(private readonly saveQuoteService: SaveQuoteService) {}

  @Post()
  @ApiOperation({ summary: 'Save a business owner to the logged in user dashboard' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user', 'businessOwner', 'admin'))
  @ApiBody({ type: CreateSaveQuoteDto })
  @HttpCode(HttpStatus.CREATED)
  async saveBusinessman(
    @Req() req: Request,
    @Body() createSaveQuoteDto: CreateSaveQuoteDto,
  ) {
    const result = await this.saveQuoteService.saveBusinessman(
      req.user!.id,
      createSaveQuoteDto,
    );

    return {
      message: 'Business owner saved successfully',
      data: result,
    };
  }

  @Get('my-saved')
  @ApiOperation({ summary: 'Get all saved business owners for the logged in user' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('user', 'businessOwner', 'admin'))
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
  async getSavedBusinessmen(@Req() req: Request) {
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.saveQuoteService.getSavedBusinessmen(
      req.user!.id,
      options,
    );

    return {
      message: 'Saved business owners fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }
}
