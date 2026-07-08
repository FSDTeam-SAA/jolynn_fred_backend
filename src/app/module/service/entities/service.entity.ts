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

  @Prop({
    required: [true, 'Service description is required'],
    trim: true,
  })
  description: string;

  @Prop({ type: ServiceLogoSchema, default: {} })
  logo?: ServiceLogo;
}

export const BusinessServiceSchema =
  SchemaFactory.createForClass(BusinessService);

BusinessServiceSchema.index({ ownerId: 1, title: 1 }, { unique: true });
