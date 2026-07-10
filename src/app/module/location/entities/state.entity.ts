import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StateDocument = HydratedDocument<State>;

@Schema({ collection: 'state', versionKey: false })
export class State {
  @Prop({ required: true })
  id: number;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  country_name?: string;

  @Prop({ trim: true })
  country_code?: string;

  @Prop({ trim: true })
  iso2?: string;

  @Prop({ type: [String], default: undefined })
  cities?: string[];
}

export const StateSchema = SchemaFactory.createForClass(State);
