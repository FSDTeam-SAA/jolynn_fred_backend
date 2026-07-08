import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ContactDocument = HydratedDocument<Contact>;

@Schema({ timestamps: true })
export class Contact {
  @Prop({
    required: [true, 'First name is required'],
    trim: true,
  })
  firstName: string;

  @Prop({
    required: [true, 'Last name is required'],
    trim: true,
  })
  lastName: string;

  @Prop({
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  })
  email: string;

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

export const ContactSchema = SchemaFactory.createForClass(Contact);