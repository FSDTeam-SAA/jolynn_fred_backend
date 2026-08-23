import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ _id: false })
export class ReviewReply {
  @Prop({
    trim: true,
  })
  message?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  repliedById?: Types.ObjectId;

  @Prop({
    trim: true,
  })
  repliedByName?: string;

  @Prop({
    trim: true,
  })
  reviewerAvatar?: string;

  @Prop()
  repliedAt?: Date;
}

const ReviewReplySchema = SchemaFactory.createForClass(ReviewReply);

@Schema({ timestamps: true })
export class Review {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: [true, 'Business id is required'],
    index: true,
  })
  businessId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: [true, 'Reviewer id is required'],
    index: true,
  })
  reviewerId: Types.ObjectId;

  @Prop({
    required: [true, 'Reviewer name is required'],
    trim: true,
  })
  reviewerName: string;

  @Prop({
    trim: true,
  })
  reviewerAvatar?: string;

  @Prop({
    required: [true, 'Business name is required'],
    trim: true,
  })
  businessName: string;

  @Prop({
    required: [true, 'Rating is required'],
    min: 1,
    max: 5,
  })
  rating: number;

  @Prop({
    required: [true, 'Review message is required'],
    trim: true,
  })
  message: string;

  @Prop({
    type: ReviewReplySchema,
    default: undefined,
  })
  reply?: ReviewReply;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ businessId: 1, createdAt: -1 });
ReviewSchema.index({ businessId: 1, reviewerId: 1 }, { unique: true });
