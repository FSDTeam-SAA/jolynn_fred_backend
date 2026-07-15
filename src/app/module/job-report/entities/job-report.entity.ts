import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type JobReportDocument = HydratedDocument<JobReport>;

@Schema({ timestamps: true })
export class JobReport {
  @Prop({
    type: Types.ObjectId,
    ref: 'HelpWanted',
    required: [true, 'Help wanted post id is required'],
  })
  helpWantedId: Types.ObjectId;

  @Prop({
    trim: true,
    lowercase: true,
  })
  reporterEmail?: string;

  @Prop({
    required: [true, 'Message is required'],
    trim: true,
  })
  message: string;
}

export const JobReportSchema = SchemaFactory.createForClass(JobReport);