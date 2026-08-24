import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ServiceCategoryDocument = HydratedDocument<ServiceCategory>;

export const SERVICE_CATEGORY_STATUSES = [
  'pending',
  'approved',
  'rejected',
] as const;

export type ServiceCategoryStatus = (typeof SERVICE_CATEGORY_STATUSES)[number];

export const SERVICE_CATEGORY_SOURCES = [
  'admin',
  'help_wanted',
  'business_registration',
  'service_creation',
] as const;

export type ServiceCategorySource = (typeof SERVICE_CATEGORY_SOURCES)[number];

@Schema({ _id: false })
export class ServiceCategoryLogo {
  @Prop()
  url?: string;

  @Prop()
  publicId?: string;
}

const ServiceCategoryLogoSchema =
  SchemaFactory.createForClass(ServiceCategoryLogo);

@Schema({ timestamps: true })
export class ServiceCategory {
  @Prop({
    required: [true, 'Category name is required'],
    trim: true,
  })
  name: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  slug: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  normalizedName: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [String], default: [] })
  keywords: string[];

  @Prop({ type: ServiceCategoryLogoSchema, default: undefined })
  logo?: ServiceCategoryLogo;

  @Prop({
    enum: SERVICE_CATEGORY_STATUSES,
    default: 'pending',
    index: true,
  })
  status: ServiceCategoryStatus;

  @Prop({
    enum: SERVICE_CATEGORY_SOURCES,
    default: 'admin',
    index: true,
  })
  source: ServiceCategorySource;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  requestedByUserId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedByAdminId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  rejectedByAdminId?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop()
  rejectedAt?: Date;

  @Prop({ trim: true })
  rejectionReason?: string;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ default: 0, min: 0 })
  viewCount: number;
}

export const ServiceCategorySchema =
  SchemaFactory.createForClass(ServiceCategory);

ServiceCategorySchema.index({ status: 1, isActive: 1, sortOrder: 1 });
ServiceCategorySchema.index({ status: 1, isActive: 1, createdAt: -1 });
