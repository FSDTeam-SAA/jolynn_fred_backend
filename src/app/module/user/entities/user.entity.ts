import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
export type UserDocument = HydratedDocument<User>;
import * as bcrypt from 'bcrypt';
import config from '../../../config';
import {
  USER_GENDERS,
  USER_ROLES,
  USER_STATUSES,
  type UserGender,
  type UserRole,
  type UserStatus,
} from 'src/app/constants/auth.constants';

@Schema({ timestamps: true })
export class User {
  @Prop({ trim: true })
  firstName?: string;

  @Prop({ trim: true })
  lastName?: string;

  @Prop({
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  })
  username?: string;

  @Prop({
    select: false,
  })
  password: string;

  @Prop({
    enum: USER_ROLES,
    default: 'user',
  })
  role: UserRole;

  @Prop({ enum: USER_GENDERS, default: 'male' })
  gender: UserGender;

  @Prop()
  phoneNumber?: string;

  @Prop({ trim: true })
  businessName?: string;

  @Prop({ lowercase: true, trim: true })
  businessEmail?: string;

  @Prop({ trim: true })
  businessWebsiteUrl?: string;

  @Prop({ trim: true })
  serviceArea?: string;

  @Prop({ trim: true })
  category?: string;

  @Prop({ type: Types.ObjectId, ref: 'ServiceCategory' })
  serviceCategoryId?: Types.ObjectId;

  @Prop()
  country: string;

  @Prop()
  city: string;

  @Prop()
  state?: string;

  @Prop()
  address: string;

  @Prop()
  postcode: string;

  @Prop()
  profilePicture: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop()
  otp?: string;

  @Prop()
  otpExpiry?: Date;

  @Prop({ enum: USER_STATUSES, default: 'active' })
  status: UserStatus;

  @Prop({ default: false })
  verifiedForget: boolean;

  @Prop({ default: false })
  agreementAccepted: boolean;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ select: false })
  emailVerificationTokenHash?: string;

  @Prop({ select: false })
  emailVerificationExpiresAt?: Date;

  @Prop()
  stripeAccountId: string;

  @Prop()
  bio: string;

  @Prop({
    enum: [
      'Boiler Customer',
      'Annual Service Agreement',
      'Heat Pump Quote',
      'Bathroom Lead',
    ],
    default: 'Boiler Customer',
  })
  tag: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;

  this.password = await bcrypt.hash(
    this.password,
    Number(config.bcryptSaltRounds),
  );
});
