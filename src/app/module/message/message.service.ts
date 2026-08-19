import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { fileUpload } from 'src/app/helpers/fileUploder';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import { User, UserDocument } from '../user/entities/user.entity';
import { CreateMessageDto, ReplyMessageDto } from './dto/create-message.dto';
import {
  Conversation,
  ConversationDocument,
} from './entities/conversation.entity';
import { Message, MessageDocument } from './entities/message.entity';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private toObjectId(id: string, label = 'id') {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, 400);
    }
    return new Types.ObjectId(id);
  }

  private async getUserOrThrow(id: string) {
    const user = await this.userModel.findById(this.toObjectId(id, 'user id'));
    if (!user) throw new HttpException('User not found', 404);
    return user;
  }

  private async getBusinessOwnerOrThrow(id: string) {
    const owner = await this.userModel.findOne({
      _id: this.toObjectId(id, 'business owner id'),
      role: 'businessOwner',
      status: 'active',
    });
    if (!owner) throw new HttpException('Business owner not found', 404);
    return owner;
  }

  private async uploadAttachments(files: Express.Multer.File[] = []) {
    if (files.length > 10) {
      throw new HttpException('You can upload a maximum of 10 attachments', 400);
    }
    return Promise.all(
      files.map((file) => fileUpload.uploadMessageAttachmentToCloudinary(file)),
    );
  }

  private async getConversationOrThrow(id: string, userId: string, role: 'user' | 'businessOwner') {
    const field = role === 'user' ? 'userId' : 'businessOwnerId';
    const conversation = await this.conversationModel.findOne({
      _id: this.toObjectId(id, 'conversation id'),
      [field]: this.toObjectId(userId, 'user id'),
    });
    if (!conversation) throw new HttpException('Conversation not found', 404);
    return conversation;
  }

  async createMessage(
    userId: string,
    dto: CreateMessageDto,
    files?: Express.Multer.File[],
  ) {
    await this.getUserOrThrow(userId);
    await this.getBusinessOwnerOrThrow(dto.businessOwnerId);
    const attachments = await this.uploadAttachments(files);
    const userObjectId = this.toObjectId(userId, 'user id');
    const businessOwnerObjectId = this.toObjectId(dto.businessOwnerId, 'business owner id');

    const conversation = await this.conversationModel.create({
      userId: userObjectId,
      businessOwnerId: businessOwnerObjectId,
      subject: dto.subject.trim(),
      lastMessage: dto.message.trim(),
      lastMessageAt: new Date(),
      unreadForBusinessOwner: 1,
    });

    const message = await this.messageModel.create({
      conversationId: conversation._id,
      senderId: userObjectId,
      recipientId: businessOwnerObjectId,
      message: dto.message.trim(),
      attachments,
    });

    return { conversation, message };
  }

  async listConversations(userId: string, role: 'user' | 'businessOwner', options: IOptions) {
    await this.getUserOrThrow(userId);
    const { limit, page, skip } = paginationHelper(options);
    const field = role === 'user' ? 'userId' : 'businessOwnerId';
    const where = { [field]: this.toObjectId(userId, 'user id') };
    const [total, data] = await Promise.all([
      this.conversationModel.countDocuments(where),
      this.conversationModel.find(where).sort({ lastMessageAt: -1 }).skip(skip).limit(limit)
        .populate('userId', 'firstName lastName username email businessName')
        .populate('businessOwnerId', 'firstName lastName username email businessName'),
    ]);
    return { meta: { page, limit, total }, data };
  }

  async getConversation(id: string, userId: string, role: 'user' | 'businessOwner') {
    const conversation = await this.getConversationOrThrow(id, userId, role);
    const counter = role === 'user' ? 'unreadForUser' : 'unreadForBusinessOwner';
    await this.conversationModel.findByIdAndUpdate(conversation._id, { [counter]: 0 });
    await this.messageModel.updateMany(
      { conversationId: conversation._id, recipientId: this.toObjectId(userId, 'user id') },
      { $set: { read: true } },
    );
    const messages = await this.messageModel.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
    return { conversation, messages };
  }

  async replyToConversation(
    id: string,
    senderId: string,
    role: 'user' | 'businessOwner',
    dto: ReplyMessageDto,
    files?: Express.Multer.File[],
  ) {
    const conversation = await this.getConversationOrThrow(id, senderId, role);
    const attachments = await this.uploadAttachments(files);
    const senderObjectId = this.toObjectId(senderId, 'user id');
    const recipientId = role === 'user' ? conversation.businessOwnerId : conversation.userId;
    const unreadField = role === 'user' ? 'unreadForBusinessOwner' : 'unreadForUser';
    const message = await this.messageModel.create({
      conversationId: conversation._id,
      senderId: senderObjectId,
      recipientId,
      message: dto.message.trim(),
      attachments,
    });
    const updatedConversation = await this.conversationModel.findByIdAndUpdate(
      conversation._id,
      {
        lastMessage: dto.message.trim(),
        lastMessageAt: new Date(),
        $inc: { [unreadField]: 1 },
      },
      { new: true },
    );
    return { conversation: updatedConversation, message };
  }
}
