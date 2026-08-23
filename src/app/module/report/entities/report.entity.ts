import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReportDocument = HydratedDocument<Report>;

@Schema({ timestamps: true })
export class Report {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: [true, 'User id is required'],
  })
  userId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner id is required'],
  })
  ownerId: Types.ObjectId;

  @Prop({
    required: [true, 'Message is required'],
    trim: true,
  })
  message: string;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
