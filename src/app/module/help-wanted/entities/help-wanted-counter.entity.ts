import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type HelpWantedCounterDocument = HydratedDocument<HelpWantedCounter>;

@Schema({ collection: 'help_wanted_counters' })
export class HelpWantedCounter {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, default: 0 })
  seq: number;
}

export const HelpWantedCounterSchema =
  SchemaFactory.createForClass(HelpWantedCounter);