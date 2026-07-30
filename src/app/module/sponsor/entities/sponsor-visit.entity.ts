import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SponsorVisitDocument = HydratedDocument<SponsorVisit>;

@Schema({ timestamps: true })
export class SponsorVisit {
  @Prop({
    type: Types.ObjectId,
    ref: 'Sponsor',
    required: true,
    index: true,
  })
  sponsorId: Types.ObjectId;
}

export const SponsorVisitSchema = SchemaFactory.createForClass(SponsorVisit);

SponsorVisitSchema.index({ createdAt: 1 });
