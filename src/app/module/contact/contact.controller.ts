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
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import AuthGuard from 'src/app/middlewares/auth.guard';
import pick from 'src/app/helpers/pick';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a contact request (public)' })
  @ApiBody({ type: CreateContactDto })
  @HttpCode(HttpStatus.CREATED)
  async createContact(@Body() createContactDto: CreateContactDto) {
    const result = await this.contactService.createContact(createContactDto);
    return {
      message: 'Contact request submitted successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all contact requests (admin only)' })
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
  async getAllContact(@Req() req: Request) {
    const params = pick(req.query, ['searchTerm']);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
    const result = await this.contactService.getAllContact(params, options);

    return {
      message: 'Contact fetched successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single contact request by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Contact id',
  })
  @HttpCode(HttpStatus.OK)
  async getSingleContact(@Param('id') id: string) {
    const result = await this.contactService.getSingleContact(id);
    return {
      message: 'Contact fetched successfully',
      data: result,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update contact request by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiBody({ type: UpdateContactDto })
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Contact id',
  })
  @HttpCode(HttpStatus.OK)
  async updateContact(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    const result = await this.contactService.updateContact(
      id,
      updateContactDto,
    );
    return {
      message: 'Contact updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete contact request by id (admin only)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('admin'))
  @ApiParam({
    name: 'id',
    required: true,
    type: String,
    example: '',
    description: 'Contact id',
  })
  @HttpCode(HttpStatus.OK)
  async deleteContact(@Param('id') id: string) {
    const result = await this.contactService.deleteContact(id);
    return {
      message: 'Contact deleted successfully',
      data: result,
    };
  }
}