import {
  HttpException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { fileUpload } from 'src/app/helpers/fileUploder';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import { User, UserDocument } from '../user/entities/user.entity';
import { activeBusinessOwnerFilter } from 'src/app/helpers/account-profile';
import { CreateMessageDto, ReplyMessageDto } from './dto/create-message.dto';
import {
  Conversation,
  ConversationDocument,
} from './entities/conversation.entity';
import { Message, MessageDocument } from './entities/message.entity';

@Injectable()
export class MessageService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async onApplicationBootstrap() {
    await this.mergeDuplicateConversations();
    await this.ensureConversationIndexes();
  }

  private async mergeDuplicateConversations() {
    const duplicateGroups = await this.conversationModel.aggregate<{
      _id: {
        userId: Types.ObjectId;
        businessOwnerId: Types.ObjectId;
      };
      conversations: Array<{
        _id: Types.ObjectId;
        lastMessage: string;
        lastMessageAt: Date;
      }>;
      count: number;
    }>([
      { $sort: { lastMessageAt: -1, _id: -1 } },
      {
        $group: {
          _id: { userId: '$userId', businessOwnerId: '$businessOwnerId' },
          conversations: {
            $push: {
              _id: '$_id',
              lastMessage: '$lastMessage',
              lastMessageAt: '$lastMessageAt',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    for (const group of duplicateGroups) {
      const [keeper, ...duplicates] = group.conversations;
      const duplicateIds = duplicates.map((conversation) => conversation._id);

      await this.messageModel.updateMany(
        { conversationId: { $in: duplicateIds } },
        { $set: { conversationId: keeper._id } },
      );
      await this.conversationModel.deleteMany({ _id: { $in: duplicateIds } });

      const [latestMessage, unreadForUser, unreadForBusinessOwner] =
        await Promise.all([
          this.messageModel
            .findOne({ conversationId: keeper._id })
            .sort({ createdAt: -1 })
            .lean(),
          this.messageModel.countDocuments({
            conversationId: keeper._id,
            recipientId: group._id.userId,
            read: false,
          }),
          this.messageModel.countDocuments({
            conversationId: keeper._id,
            recipientId: group._id.businessOwnerId,
            read: false,
          }),
        ]);

      const latestMessageWithTimestamp = latestMessage as
        | (typeof latestMessage & { createdAt?: Date })
        | null;

      await this.conversationModel.findByIdAndUpdate(keeper._id, {
        lastMessage: latestMessage?.message || keeper.lastMessage,
        lastMessageAt:
          latestMessageWithTimestamp?.createdAt || keeper.lastMessageAt,
        unreadForUser,
        unreadForBusinessOwner,
      });
    }

    if (duplicateGroups.length) {
      this.logger.log(
        `Merged ${duplicateGroups.length} duplicate conversation group(s)`,
      );
    }
  }

  private async ensureConversationIndexes() {
    let indexes: Awaited<
      ReturnType<typeof this.conversationModel.collection.indexes>
    > = [];

    try {
      indexes = await this.conversationModel.collection.indexes();
    } catch (error: unknown) {
      if ((error as { code?: number })?.code !== 26) throw error;
    }

    const pairIndexes = indexes.filter((index) => {
      const key = index.key as Record<string, number>;
      return (
        Object.keys(key).length === 2 &&
        key.userId === 1 &&
        key.businessOwnerId === 1
      );
    });
    const uniquePairIndex = pairIndexes.find((index) => index.unique);

    for (const index of pairIndexes) {
      if (!index.unique && index.name) {
        try {
          await this.conversationModel.collection.dropIndex(index.name);
        } catch (error: unknown) {
          if ((error as { code?: number })?.code !== 27) throw error;
        }
      }
    }

    await Promise.all([
      this.conversationModel.collection.createIndex(
        { userId: 1 },
        { name: 'userId_1' },
      ),
      this.conversationModel.collection.createIndex(
        { businessOwnerId: 1 },
        { name: 'businessOwnerId_1' },
      ),
      this.conversationModel.collection.createIndex(
        { lastMessageAt: 1 },
        { name: 'lastMessageAt_1' },
      ),
    ]);

    if (!uniquePairIndex) {
      try {
        await this.conversationModel.collection.createIndex(
          { userId: 1, businessOwnerId: 1 },
          { unique: true, name: 'unique_user_business_conversation' },
        );
      } catch (error: unknown) {
        if (!this.isDuplicateKeyError(error)) throw error;

        await this.mergeDuplicateConversations();
        await this.conversationModel.collection.createIndex(
          { userId: 1, businessOwnerId: 1 },
          { unique: true, name: 'unique_user_business_conversation' },
        );
      }
    }
  }

  private toObjectId(id: string, label = 'id') {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, 400);
    }
    return new Types.ObjectId(id);
  }

  private isDuplicateKeyError(error: unknown) {
    return (error as { code?: number })?.code === 11000;
  }

  private async getUserOrThrow(id: string) {
    const user = await this.userModel.findById(this.toObjectId(id, 'user id'));
    if (!user) throw new HttpException('User not found', 404);
    return user;
  }

  private async getBusinessOwnerOrThrow(id: string) {
    const owner = await this.userModel.findOne({
      $and: [
        { _id: this.toObjectId(id, 'business owner id') },
        activeBusinessOwnerFilter,
      ],
    });
    if (!owner) throw new HttpException('Business owner not found', 404);
    return owner;
  }

  private async uploadAttachments(files: Express.Multer.File[] = []) {
    if (files.length > 10) {
      throw new HttpException(
        'You can upload a maximum of 10 attachments',
        400,
      );
    }
    return Promise.all(
      files.map((file) => fileUpload.uploadMessageAttachmentToCloudinary(file)),
    );
  }

  private async getConversationOrThrow(
    id: string,
    userId: string,
    role: 'user' | 'businessOwner',
  ) {
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
    const businessOwnerObjectId = this.toObjectId(
      dto.businessOwnerId,
      'business owner id',
    );

    const where = {
      userId: userObjectId,
      businessOwnerId: businessOwnerObjectId,
    };
    const latestMessageUpdate = {
      $set: {
        subject: dto.subject.trim(),
        lastMessage: dto.message.trim(),
        lastMessageAt: new Date(),
      },
      $inc: { unreadForBusinessOwner: 1 },
    };
    let conversation: ConversationDocument | null;

    try {
      conversation = await this.conversationModel.findOneAndUpdate(
        where,
        {
          ...latestMessageUpdate,
          $setOnInsert: {
            userId: userObjectId,
            businessOwnerId: businessOwnerObjectId,
            unreadForUser: 0,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: false,
        },
      );
    } catch (error: unknown) {
      if (!this.isDuplicateKeyError(error)) throw error;

      conversation = await this.conversationModel.findOneAndUpdate(
        where,
        latestMessageUpdate,
        { new: true, runValidators: true },
      );
    }

    if (!conversation) {
      throw new HttpException('Unable to create or reuse conversation', 500);
    }

    const message = await this.messageModel.create({
      conversationId: conversation._id,
      senderId: userObjectId,
      recipientId: businessOwnerObjectId,
      message: dto.message.trim(),
      attachments,
    });

    return { conversation, message };
  }

  async listConversations(
    userId: string,
    role: 'user' | 'businessOwner',
    options: IOptions,
  ) {
    await this.getUserOrThrow(userId);
    const { limit, page, skip } = paginationHelper(options);
    const field = role === 'user' ? 'userId' : 'businessOwnerId';
    const profileField = role === 'user' ? 'businessOwnerId' : 'userId';
    const where = { [field]: this.toObjectId(userId, 'user id') };
    const [result] = await this.conversationModel.aggregate<{
      meta: Array<{ total: number }>;
      data: Conversation[];
    }>([
      { $match: where },
      { $sort: { lastMessageAt: -1, _id: -1 } },
      {
        $group: {
          _id: `$${profileField}`,
          conversation: { $first: '$$ROOT' },
        },
      },
      {
        $facet: {
          meta: [{ $count: 'total' }],
          data: [
            { $replaceRoot: { newRoot: '$conversation' } },
            { $sort: { lastMessageAt: -1, _id: -1 } },
            { $skip: skip },
            { $limit: limit },
          ],
        },
      },
    ]);
    const data = await this.conversationModel.populate(result?.data || [], [
      {
        path: 'userId',
        select:
          'firstName lastName username email businessName profilePicture userProfile',
      },
      {
        path: 'businessOwnerId',
        select:
          'firstName lastName username email businessName profilePicture businessProfile',
      },
    ]);
    const total = result?.meta[0]?.total || 0;

    return { meta: { page, limit, total }, data };
  }

  async getConversation(
    id: string,
    userId: string,
    role: 'user' | 'businessOwner',
  ) {
    const conversation = await this.getConversationOrThrow(id, userId, role);
    const counter =
      role === 'user' ? 'unreadForUser' : 'unreadForBusinessOwner';
    await this.conversationModel.findByIdAndUpdate(conversation._id, {
      [counter]: 0,
    });
    await this.messageModel.updateMany(
      {
        conversationId: conversation._id,
        recipientId: this.toObjectId(userId, 'user id'),
      },
      { $set: { read: true } },
    );
    const messages = await this.messageModel
      .find({ conversationId: conversation._id })
      .sort({ createdAt: 1 });
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
    const recipientId =
      role === 'user' ? conversation.businessOwnerId : conversation.userId;
    const unreadField =
      role === 'user' ? 'unreadForBusinessOwner' : 'unreadForUser';
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
