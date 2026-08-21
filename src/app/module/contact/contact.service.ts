import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Contact, ContactDocument } from './entities/contact.entity';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import sendMailer from 'src/app/helpers/sendMailer';
import { createNotificationEmailTemplate } from 'src/app/helpers/template';
import { ReplyContactDto } from './dto/reply-contact.dto';

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

  private toObjectId(id: string, label = 'id') {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, 400);
    }

    return new Types.ObjectId(id);
  }

  private escapeHtml(value: string) {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
        })[character]!,
    );
  }

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
    const contact = await this.contactModel.findById(
      this.toObjectId(id, 'contact id'),
    );
    if (!contact) {
      throw new HttpException('Contact not found', 404);
    }
    return contact;
  }

  async updateContact(id: string, updateContactDto: UpdateContactDto) {
    const contactObjectId = this.toObjectId(id, 'contact id');
    const contact = await this.contactModel.findById(contactObjectId);
    if (!contact) {
      throw new HttpException('Contact not found', 404);
    }

    const updatedContact = await this.contactModel.findByIdAndUpdate(
      contactObjectId,
      updateContactDto,
      { new: true },
    );
    return updatedContact;
  }

  async deleteContact(id: string) {
    const contactObjectId = this.toObjectId(id, 'contact id');
    const contact = await this.contactModel.findById(contactObjectId);
    if (!contact) {
      throw new HttpException('Contact not found', 404);
    }
    const result = await this.contactModel.findByIdAndDelete(contactObjectId);
    return result;
  }

  async replyToContact(
    id: string,
    adminId: string,
    replyContactDto: ReplyContactDto,
  ) {
    const contactObjectId = this.toObjectId(id, 'contact id');
    const adminObjectId = this.toObjectId(adminId, 'admin id');
    const contact = await this.contactModel.findById(contactObjectId);

    if (!contact) {
      throw new HttpException('Contact not found', 404);
    }

    const safeFirstName = this.escapeHtml(contact.firstName);
    const safeSubject = this.escapeHtml(replyContactDto.subject);
    const safeDescription = this.escapeHtml(
      replyContactDto.description,
    ).replace(/\r?\n/g, '<br />');

    await sendMailer(
      contact.email,
      replyContactDto.subject,
      createNotificationEmailTemplate({
        heading: safeSubject,
        subheading: 'A response from the SideQuote support team',
        greetingName: safeFirstName,
        introText: safeDescription,
        footerText:
          'This email was sent in response to the contact request you submitted to SideQuote.',
      }),
    );

    return this.contactModel.findByIdAndUpdate(
      contactObjectId,
      {
        isReplied: true,
        repliedAt: new Date(),
        repliedById: adminObjectId,
        replySubject: replyContactDto.subject,
        replyDescription: replyContactDto.description,
      },
      { new: true, runValidators: true },
    );
  }
}
