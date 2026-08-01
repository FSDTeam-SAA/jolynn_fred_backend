import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type HelpWantedDocument = HydratedDocument<HelpWanted>;

@Schema({ timestamps: true })
export class HelpWanted {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  userId?: Types.ObjectId;

  @Prop({
    required: [true, 'Username is required'],
    trim: true,
  })
  username: string;

  @Prop({
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  })
  email: string;

  @Prop({
    required: [true, 'Zipcode is required'],
    trim: true,
  })
  zipcode: string;

  @Prop({
    required: [true, 'Category is required'],
    trim: true,
  })
  category: string;

  @Prop({
    required: [true, 'Budget range is required'],
    trim: true,
  })
  budgetRange: string;

  @Prop({ type: Types.ObjectId, ref: 'ServiceCategory' })
  serviceCategoryId?: Types.ObjectId;

  @Prop({
    required: [true, 'Phone is required'],
    trim: true,
  })
  phone: string;

  @Prop({
    required: [true, 'Message is required'],
    trim: true,
  })
  message: string;
}

export const HelpWantedSchema = SchemaFactory.createForClass(HelpWanted);
