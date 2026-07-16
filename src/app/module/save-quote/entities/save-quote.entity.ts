import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SaveQuoteDocument = HydratedDocument<SaveQuote>;

@Schema({ timestamps: true })
export class SaveQuote {
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
}

export const SaveQuoteSchema = SchemaFactory.createForClass(SaveQuote);

SaveQuoteSchema.index({ userId: 1, businessOwnerId: 1 }, { unique: true });
