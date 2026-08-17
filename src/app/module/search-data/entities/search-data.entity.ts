import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SearchDataDocument = HydratedDocument<SearchData>;

@Schema({ timestamps: true })
export class SearchData {
  @Prop({ required: true, trim: true, index: true })
  keyword: string;
}

export const SearchDataSchema = SchemaFactory.createForClass(SearchData);
SearchDataSchema.index({ createdAt: 1 });
