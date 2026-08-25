import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BusinessServiceDocument = HydratedDocument<BusinessService>;

@Schema({ _id: false })
export class ServiceLogo {
  @Prop()
  url?: string;

  @Prop()
  publicId?: string;
}

const ServiceLogoSchema = SchemaFactory.createForClass(ServiceLogo);

@Schema({ timestamps: true })
export class BusinessService {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required'],
    index: true,
  })
  ownerId: Types.ObjectId;

  @Prop({
    required: [true, 'Service title is required'],
    trim: true,
  })
  title: string;

  @Prop({ type: Types.ObjectId, ref: 'ServiceCategory', index: true })
  serviceCategoryId: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  requestedCategory?: string | null;

  @Prop({ type: [String], default: [] })
  keywords: string[];

  @Prop({ type: String, trim: true, default: 'active' })
  status: 'active' | 'pending';

  @Prop({
    required: [true, 'Service description is required'],
    trim: true,
  })
  description: string;

  @Prop({ type: ServiceLogoSchema, default: {} })
  logo?: ServiceLogo;

  @Prop({ default: 0, min: 0 })
  viewCount: number;
}

export const BusinessServiceSchema =
  SchemaFactory.createForClass(BusinessService);

BusinessServiceSchema.index({ ownerId: 1, title: 1 }, { unique: true });
