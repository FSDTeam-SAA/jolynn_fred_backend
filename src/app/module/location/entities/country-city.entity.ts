import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export interface CountryCityItem {
  name?: string;
  city?: string;
  state_code?: string;
  stateCode?: string;
  state_name?: string;
  stateName?: string;
}

export type CountryCityDocument = HydratedDocument<CountryCity>;

@Schema({ collection: 'country_cities', versionKey: false, strict: false })
export class CountryCity {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: [Object], default: [] })
  cities: Array<string | CountryCityItem>;
}

export const CountryCitySchema = SchemaFactory.createForClass(CountryCity);
