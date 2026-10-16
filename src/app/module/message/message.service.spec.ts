import { HttpException } from '@nestjs/common';
import { Types } from 'mongoose';
import { fileUpload } from 'src/app/helpers/fileUploder';
import { MessageService } from './message.service';

const createLatestMessageQuery = (result: Record<string, unknown> | null) => ({
  sort: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(result),
});

describe('MessageService deleteOwnMessage', () => {
  const conversationId = new Types.ObjectId();
  const senderId = new Types.ObjectId();
  const recipientId = new Types.ObjectId();
  const messageId = new Types.ObjectId();
  let conversationModel: Record<string, jest.Mock>;
  let messageModel: Record<string, jest.Mock>;
  let service: MessageService;

  beforeEach(() => {
    conversationModel = {
      findById: jest.fn().mockResolvedValue({
        _id: conversationId,
        userId: senderId,
        businessOwnerId: recipientId,
      }),
      findByIdAndUpdate: jest.fn().mockResolvedValue({}),
      findByIdAndDelete: jest.fn().mockResolvedValue({}),
    };
    messageModel = {
      findOneAndDelete: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest
        .fn()
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2),
    };
    service = new MessageService(
      conversationModel as any,
      messageModel as any,
      {} as any,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deletes only the sender message and refreshes conversation metadata', async () => {
    const createdAt = new Date('2026-10-16T08:00:00.000Z');
    messageModel.findOneAndDelete.mockResolvedValue({
      _id: messageId,
      conversationId,
      senderId,
      attachments: [
        {
          public_id: 'messages/photo',
          mimetype: 'image/jpeg',
        },
        {
          public_id: 'messages/document',
          mimetype: 'application/pdf',
        },
      ],
    });
    messageModel.findOne.mockReturnValue(
      createLatestMessageQuery({
        _id: new Types.ObjectId(),
        message: 'Previous message',
        createdAt,
      }),
    );
    const deleteAttachmentSpy = jest
      .spyOn(fileUpload, 'deleteResourceFromCloudinary')
      .mockResolvedValue();

    await expect(
      service.deleteOwnMessage(messageId.toString(), senderId.toString()),
    ).resolves.toEqual({
      deletedMessageId: messageId.toString(),
      conversationId: conversationId.toString(),
      conversationDeleted: false,
    });

    expect(messageModel.findOneAndDelete).toHaveBeenCalledWith({
      _id: messageId,
      senderId,
    });
    expect(conversationModel.findByIdAndUpdate).toHaveBeenCalledWith(
      conversationId,
      {
        $set: {
          lastMessage: 'Previous message',
          lastMessageAt: createdAt,
          unreadForUser: 1,
          unreadForBusinessOwner: 2,
        },
      },
    );
    expect(deleteAttachmentSpy).toHaveBeenCalledWith('messages/photo', 'image');
    expect(deleteAttachmentSpy).toHaveBeenCalledWith(
      'messages/document',
      'raw',
    );
  });

  it('rejects deletion when the message does not belong to the account', async () => {
    messageModel.findOneAndDelete.mockResolvedValue(null);

    await expect(
      service.deleteOwnMessage(messageId.toString(), senderId.toString()),
    ).rejects.toMatchObject<HttpException>({ status: 404 });

    expect(messageModel.findOne).not.toHaveBeenCalled();
    expect(conversationModel.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(conversationModel.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it('removes the conversation when its last message is deleted', async () => {
    messageModel.findOneAndDelete.mockResolvedValue({
      _id: messageId,
      conversationId,
      senderId,
      attachments: [],
    });
    messageModel.findOne.mockReturnValue(createLatestMessageQuery(null));

    await expect(
      service.deleteOwnMessage(messageId.toString(), senderId.toString()),
    ).resolves.toMatchObject({ conversationDeleted: true });

    expect(conversationModel.findByIdAndDelete).toHaveBeenCalledWith(
      conversationId,
    );
    expect(conversationModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
