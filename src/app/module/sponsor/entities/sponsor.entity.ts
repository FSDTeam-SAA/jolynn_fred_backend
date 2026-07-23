import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SponsorDocument = HydratedDocument<Sponsor>;

@Schema({ timestamps: true })
export class Sponsor {
  @Prop({
    required: [true, 'Title is required'],
    trim: true,
  })
  title: string;

  @Prop({
    required: [true, 'Content is required'],
    trim: true,
  })
  content: string;

  @Prop()
  image: string;

  @Prop()
  imagePublicId: string;

  @Prop()
  link?: string;
}

export const SponsorSchema = SchemaFactory.createForClass(Sponsor);