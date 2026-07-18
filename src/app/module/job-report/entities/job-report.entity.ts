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
    type: Types.ObjectId,
    ref: 'User',
    required: [true, 'User id is required'],
  })
  userId: Types.ObjectId;

  @Prop({
    required: [true, 'Message is required'],
    trim: true,
  })
  message: string;
}

export const JobReportSchema = SchemaFactory.createForClass(JobReport);