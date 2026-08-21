import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type QouteReplyDocument = HydratedDocument<QouteReply>;
export type QouteReplySenderRole = 'user' | 'businessOwner';

@Schema({ timestamps: true })
export class QouteReply {
  @Prop({ type: Types.ObjectId, ref: 'Qoute', required: true, index: true })
  qouteId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipientId: Types.ObjectId;

  @Prop({ enum: ['user', 'businessOwner'], required: true })
  senderRole: QouteReplySenderRole;

  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ required: true, trim: true })
  description: string;
}

export const QouteReplySchema = SchemaFactory.createForClass(QouteReply);

QouteReplySchema.index({ qouteId: 1, createdAt: 1 });
