import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubCategoryDocument = HydratedDocument<SubCategory>;

@Schema({ timestamps: true })
export class SubCategory {
  @Prop({
    type: Types.ObjectId,
    ref: 'BusinessService',
    required: [true, 'Business service is required'],
    index: true,
  })
  serviceId: Types.ObjectId;

  @Prop({
    required: [true, 'Subcategory is required'],
    trim: true,
  })
  subcategory: string;
}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);

SubCategorySchema.index(
  { serviceId: 1, subcategory: 1 },
  {
    unique: true,
    collation: { locale: 'en', strength: 2 },
  },
);
SubCategorySchema.index({ subcategory: 1 });
