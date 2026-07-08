import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Contact, ContactDocument } from './entities/contact.entity';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';

const contactSearchAbleFields = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'message',
];

@Injectable()
export class ContactService {
  constructor(
    @InjectModel(Contact.name)
    private readonly contactModel: Model<ContactDocument>,
  ) {}

  async createContact(createContactDto: CreateContactDto) {
    const contact = await this.contactModel.create(createContactDto);
    return contact;
  }

  async getAllContact(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const whereConditions = buildWhereConditions(
      params,
      contactSearchAbleFields,
    );

    const total = await this.contactModel.countDocuments(whereConditions);
    const contacts = await this.contactModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any);

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: contacts,
    };
  }

  async getSingleContact(id: string) {
    const contact = await this.contactModel.findById(id);
    if (!contact) {
      throw new HttpException('Contact not found', 404);
    }
    return contact;
  }

  async updateContact(id: string, updateContactDto: UpdateContactDto) {
    const contact = await this.contactModel.findById(id);
    if (!contact) {
      throw new HttpException('Contact not found', 404);
    }

    const updatedContact = await this.contactModel.findByIdAndUpdate(
      id,
      updateContactDto,
      { new: true },
    );
    return updatedContact;
  }

  async deleteContact(id: string) {
    const contact = await this.contactModel.findById(id);
    if (!contact) {
      throw new HttpException('Contact not found', 404);
    }
    const result = await this.contactModel.findByIdAndDelete(id);
    return result;
  }
}