import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import type { IFilterParams } from 'src/app/helpers/pick';
import { User, UserDocument } from '../user/entities/user.entity';
import { CreateQouteDto } from './dto/create-qoute.dto';
import { UpdateQouteDto } from './dto/update-qoute.dto';
import { Qoute, QouteDocument } from './entities/qoute.entity';
import sendMailer from 'src/app/helpers/sendMailer';
import { createNotificationEmailTemplate } from 'src/app/helpers/template';
import { ReplyQouteDto } from './dto/reply-qoute.dto';
import {
  QouteReply,
  QouteReplyDocument,
  type QouteReplySenderRole,
} from './entities/qoute-reply.entity';
const qouteSearchAbleFields = [
  'name',
  'email',
  'phoneNumber',
  'serviceNeeded',
  'projectDetails',
  'businessOwnerName',
  'status',
];

@Injectable()
export class QouteService {
  constructor(
    @InjectModel(Qoute.name)
    private readonly qouteModel: Model<QouteDocument>,
    @InjectModel(QouteReply.name)
    private readonly qouteReplyModel: Model<QouteReplyDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private normalizePayload<T extends CreateQouteDto | UpdateQouteDto>(
    payload: T,
  ) {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([, value]) => value !== undefined && value !== '',
      ),
    ) as T;
  }

  private toObjectId(id: string, label = 'reference') {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, 400);
    }

    return new Types.ObjectId(id);
  }

  private buildDisplayName(user: UserDocument) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return user.businessName || fullName || user.username || user.email;
  }

  private async getBusinessOwnerOrThrow(businessOwnerId: string) {
    const businessOwner = await this.userModel.findOne({
      _id: this.toObjectId(businessOwnerId, 'business owner id'),
      role: 'businessOwner',
    });

    if (!businessOwner) {
      throw new HttpException('Business owner not found', 404);
    }

    return businessOwner;
  }

  private async getUserOrThrow(userId: string) {
    const user = await this.userModel.findById(
      this.toObjectId(userId, 'user id'),
    );

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    return user;
  }

  private async getQouteOrThrow(id: string) {
    const qoute = await this.qouteModel.findById(
      this.toObjectId(id, 'qoute id'),
    );

    if (!qoute) {
      throw new HttpException('Qoute request not found', 404);
    }

    return qoute;
  }

  private async getOwnedQouteOrThrow(id: string, businessOwnerId: string) {
    const qoute = await this.qouteModel.findOne({
      _id: this.toObjectId(id, 'qoute id'),
      businessOwnerId: this.toObjectId(businessOwnerId, 'business owner id'),
    });

    if (!qoute) {
      throw new HttpException('Qoute request not found', 404);
    }

    return qoute;
  }

  private async getUserOwnedQouteOrThrow(id: string, userId: string) {
    const qoute = await this.qouteModel.findOne({
      _id: this.toObjectId(id, 'qoute id'),
      userId: this.toObjectId(userId, 'user id'),
    });

    if (!qoute) {
      throw new HttpException('Qoute request not found', 404);
    }

    return qoute;
  }

  private async createQouteRecord(
    payload: CreateQouteDto,
    businessOwner: UserDocument,
    userId: string,
  ) {
    const qoute = await this.qouteModel.create({
      ...payload,
      email: payload.email.toLowerCase(),
      businessOwnerId: businessOwner._id,
      businessOwnerName: this.buildDisplayName(businessOwner),
      userId: this.toObjectId(userId, 'user id'),
    });

    const notifyEmail = businessOwner.businessEmail || businessOwner.email;

    if (notifyEmail) {
      sendMailer(
        notifyEmail,
        'New Quote Request Received',
        createNotificationEmailTemplate({
          heading: 'New Quote Request',
          subheading: 'You have received a new quote request.',
          greetingName: this.buildDisplayName(businessOwner),
          introText: `A customer is interested in your service: ${payload.serviceNeeded}. Please review the details below and reach out as soon as possible.`,
          details: [
            { label: 'Requested By', value: payload.name },
            { label: 'Email', value: payload.email },
            { label: 'Phone', value: payload.phoneNumber },
            { label: 'Service Needed', value: payload.serviceNeeded },
            { label: 'Project Details', value: payload.projectDetails },
          ],
          noteTitle: 'Next Step',
          noteText:
            'Open this request in your dashboard to send the customer a reply.',
        }),
      ).catch((err) => console.error('Failed to send quote email:', err));
    }

    return qoute;
  }

  private async getPaginatedQoutes(
    whereConditions: Record<string, unknown>,
    options: IOptions,
  ) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const total = await this.qouteModel.countDocuments(whereConditions);
    const qoutes = await this.qouteModel
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
      data: qoutes,
    };
  }

  async createMyQoute(userId: string, createQouteDto: CreateQouteDto) {
    await this.getUserOrThrow(userId);

    const payload = this.normalizePayload(createQouteDto);
    const businessOwner = await this.getBusinessOwnerOrThrow(
      payload.businessOwnerId,
    );

    return this.createQouteRecord(payload, businessOwner, userId);
  }

  async getAllQoute(params: IFilterParams, options: IOptions) {
    const whereConditions = buildWhereConditions(params, qouteSearchAbleFields);

    return this.getPaginatedQoutes(whereConditions, options);
  }

  async getMyBusinessQoutes(
    businessOwnerId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    await this.getBusinessOwnerOrThrow(businessOwnerId);

    const whereConditions = buildWhereConditions(
      params,
      qouteSearchAbleFields,
      {
        businessOwnerId: this.toObjectId(businessOwnerId, 'business owner id'),
      },
    );

    return this.getPaginatedQoutes(whereConditions, options);
  }

  async getMyUserQoutes(
    userId: string,
    params: IFilterParams,
    options: IOptions,
  ) {
    await this.getUserOrThrow(userId);

    const whereConditions = buildWhereConditions(
      params,
      qouteSearchAbleFields,
      {
        userId: this.toObjectId(userId, 'user id'),
      },
    );

    return this.getPaginatedQoutes(whereConditions, options);
  }

  async getSingleQoute(id: string) {
    return this.getQouteOrThrow(id);
  }

  async getMyBusinessSingleQoute(id: string, businessOwnerId: string) {
    return this.getOwnedQouteOrThrow(id, businessOwnerId);
  }

  async getMyUserSingleQoute(id: string, userId: string) {
    await this.getUserOrThrow(userId);
    return this.getUserOwnedQouteOrThrow(id, userId);
  }

  private async createReply(
    qoute: QouteDocument,
    senderId: string,
    senderRole: QouteReplySenderRole,
    replyQouteDto: ReplyQouteDto,
  ) {
    const senderObjectId = this.toObjectId(senderId, 'sender id');
    const recipientId =
      senderRole === 'user' ? qoute.businessOwnerId : qoute.userId;

    if (!recipientId) {
      throw new HttpException(
        'This qoute was not created by a logged in user and cannot receive dashboard replies',
        400,
      );
    }

    return this.qouteReplyModel.create({
      qouteId: qoute._id,
      senderId: senderObjectId,
      recipientId,
      senderRole,
      subject: replyQouteDto.subject.trim(),
      description: replyQouteDto.description.trim(),
    });
  }

  private async getReplies(qouteId: Types.ObjectId) {
    return this.qouteReplyModel
      .find({ qouteId })
      .sort({ createdAt: 1 })
      .populate(
        'senderId',
        'firstName lastName username businessName profilePicture',
      )
      .populate(
        'recipientId',
        'firstName lastName username businessName profilePicture',
      );
  }

  async replyAsBusinessOwner(
    id: string,
    businessOwnerId: string,
    replyQouteDto: ReplyQouteDto,
  ) {
    const qoute = await this.getOwnedQouteOrThrow(id, businessOwnerId);
    const reply = await this.createReply(
      qoute,
      businessOwnerId,
      'businessOwner',
      replyQouteDto,
    );
    const updatedQoute = await this.qouteModel.findByIdAndUpdate(
      qoute._id,
      { isReplied: true },
      { new: true, runValidators: true },
    );

    return { qoute: updatedQoute, reply };
  }

  async replyAsUser(id: string, userId: string, replyQouteDto: ReplyQouteDto) {
    const qoute = await this.getUserOwnedQouteOrThrow(id, userId);

    if (!qoute.isReplied) {
      throw new HttpException(
        'You can reply after the business owner responds to this qoute',
        400,
      );
    }

    const reply = await this.createReply(qoute, userId, 'user', replyQouteDto);

    return { qoute, reply };
  }

  async getMyBusinessQouteReplies(id: string, businessOwnerId: string) {
    const qoute = await this.getOwnedQouteOrThrow(id, businessOwnerId);
    return this.getReplies(qoute._id);
  }

  async getMyUserQouteReplies(id: string, userId: string) {
    const qoute = await this.getUserOwnedQouteOrThrow(id, userId);
    return this.getReplies(qoute._id);
  }

  async updateQoute(id: string, updateQouteDto: UpdateQouteDto) {
    const qoute = await this.getQouteOrThrow(id);
    const payload = this.normalizePayload(updateQouteDto);

    const updatedQoute = await this.qouteModel.findByIdAndUpdate(
      qoute._id,
      payload,
      { new: true, runValidators: true },
    );

    return updatedQoute;
  }

  async updateMyBusinessQoute(
    id: string,
    businessOwnerId: string,
    updateQouteDto: UpdateQouteDto,
  ) {
    const qoute = await this.getOwnedQouteOrThrow(id, businessOwnerId);
    const payload = this.normalizePayload(updateQouteDto);

    const updatedQoute = await this.qouteModel.findByIdAndUpdate(
      qoute._id,
      payload,
      { new: true, runValidators: true },
    );

    return updatedQoute;
  }

  async deleteQoute(id: string) {
    const qoute = await this.getQouteOrThrow(id);
    await this.qouteModel.findByIdAndDelete(qoute._id);
    await this.qouteReplyModel.deleteMany({ qouteId: qoute._id });
    return qoute;
  }

  async deleteMyBusinessQoute(id: string, businessOwnerId: string) {
    await this.getBusinessOwnerOrThrow(businessOwnerId);
    const qoute = await this.getOwnedQouteOrThrow(id, businessOwnerId);
    await this.qouteModel.findByIdAndDelete(qoute._id);
    await this.qouteReplyModel.deleteMany({ qouteId: qoute._id });
    return qoute;
  }

  async deleteMyUserQoute(id: string, userId: string) {
    await this.getUserOrThrow(userId);
    const qoute = await this.getUserOwnedQouteOrThrow(id, userId);
    await this.qouteModel.findByIdAndDelete(qoute._id);
    await this.qouteReplyModel.deleteMany({ qouteId: qoute._id });
    return qoute;
  }
}
