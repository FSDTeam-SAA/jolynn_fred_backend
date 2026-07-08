import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type GallaryDocument = HydratedDocument<Gallary>;

@Schema({ _id: false })
export class GallaryImage {
  @Prop()
  url?: string;

  @Prop()
  publicId?: string;
}

const GallaryImageSchema = SchemaFactory.createForClass(GallaryImage);

@Schema({ timestamps: true })
export class Gallary {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    required: [true, 'Gallary title is required'],
    trim: true,
  })
  title: string;

  @Prop({
    type: [GallaryImageSchema],
    default: [],
  })
  images: GallaryImage[];
}

export const GallarySchema = SchemaFactory.createForClass(Gallary);

GallarySchema.index({ userId: 1, title: 1 }, { unique: true });
