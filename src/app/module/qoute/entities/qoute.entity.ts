import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type QouteDocument = HydratedDocument<Qoute>;

export const QOUTE_STATUSES = [
  'pending',
  'inProgress',
  'responded',
  'closed',
] as const;

export type QouteStatus = (typeof QOUTE_STATUSES)[number];

@Schema({ timestamps: true })
export class Qoute {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: [true, 'User id is required'],
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: [true, 'Business owner id is required'],
    index: true,
  })
  businessOwnerId: Types.ObjectId;

  @Prop({
    required: [true, 'Business owner name is required'],
    trim: true,
  })
  businessOwnerName: string;

  @Prop({
    required: [true, 'Name is required'],
    trim: true,
  })
  name: string;

  @Prop({
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({
    trim: true,
  })
  phoneNumber?: string;

  @Prop({
    required: [true, 'Service needed is required'],
    trim: true,
  })
  serviceNeeded: string;

  @Prop({
    required: [true, 'Project details are required'],
    trim: true,
  })
  projectDetails: string;

  @Prop({
    enum: QOUTE_STATUSES,
    default: 'pending',
  })
  status: QouteStatus;

  @Prop({ default: false, index: true })
  isReplied: boolean;
}

export const QouteSchema = SchemaFactory.createForClass(Qoute);

QouteSchema.index({ businessOwnerId: 1, createdAt: -1 });
QouteSchema.index({ userId: 1, createdAt: -1 });
