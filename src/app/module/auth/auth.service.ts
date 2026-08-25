import { HttpException, Injectable } from '@nestjs/common';
import {
  LoginAuthDto,
  RegisterBusinessOwnerDto,
  RegisterExistingUserBusinessOwnerDto,
  RegisterUserDto,
} from './dto/create-auth.dto';
import { User, UserDocument } from '../user/entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import config from '../../config';
import sendMailer from 'src/app/helpers/sendMailer';
import {
  createForgotPasswordEmailTemplate,
  createRegistrationConfirmationEmailTemplate,
} from 'src/app/helpers/template';
import { type UserRole } from 'src/app/constants/auth.constants';
import {
  isReservedUsername,
  normalizeUsername,
  USERNAME_REGEX,
} from 'src/app/helpers/username';
import { createNotificationEmailTemplate } from 'src/app/helpers/template';

import { ServiceCategoryService } from '../service-category/service-category.service';
import {
  BusinessService,
  BusinessServiceDocument,
} from '../service/entities/service.entity';
import { isEmail } from 'class-validator';
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(BusinessService.name)
    private readonly businessServiceModel: Model<BusinessServiceDocument>,
    private readonly jwtService: jwt.JwtService,
    private readonly serviceCategoryService: ServiceCategoryService,
  ) {}

  private isOtherCategory(category?: string) {
    return ['other', 'others', '__other__'].includes(
      category?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '',
    );
  }

  private notifyAdminAboutCategoryApproval(details: {
    category: string;
    name: string;
    email: string;
    type: string;
  }) {
    if (!config.email.admin) return;
    sendMailer(
      config.email.admin,
      'Business Category Approval Required',
      createNotificationEmailTemplate({
        heading: 'Business Category Approval Needed',
        subheading: 'A business profile is waiting for category approval.',
        introText: `A user created a business profile using a new category. Please review and approve the category before publishing this business profile on the platform.`,
        details: [
          { label: 'Requested Category', value: details.category },
          { label: 'Business Owner', value: details.name },
          { label: 'Email', value: details.email },
          { label: 'Request Type', value: details.type },
        ],
        noteTitle: 'Action required',
        noteText:
          'Approve or reject the requested category from the admin dashboard.',
      }),
    ).catch((error) =>
      console.error('Failed to send business category approval email:', error),
    );
  }

  private async createBusinessProfileService(
    ownerId: Types.ObjectId,
    category: string,
    requestedCategory: string | undefined,
    serviceCategory: { _id: Types.ObjectId; name: string; status: string },
  ) {
    const isPendingCategory = serviceCategory.status === 'pending';
    const isOtherPendingCategory =
      this.isOtherCategory(category) && isPendingCategory;

    return this.businessServiceModel.create({
      ownerId,
      title: isOtherPendingCategory ? category : serviceCategory.name,
      requestedCategory: isOtherPendingCategory ? requestedCategory : null,
      serviceCategoryId: serviceCategory._id,
      description: isOtherPendingCategory
        ? `Service requested for ${requestedCategory}`
        : `${serviceCategory.name} service`,
      status: isPendingCategory ? 'pending' : 'active',
    });
  }

  private sanitizeUser(user: UserDocument) {
    const rawUser = user.toObject() as unknown as {
      password?: string;
      [key: string]: unknown;
    };
    const { password: _password, ...sanitizedUser } = rawUser;

    return sanitizedUser;
  }

  private createTokenPayload(user: UserDocument) {
    return { id: user._id, email: user.email, role: user.role };
  }

  private buildCookieOptions() {
    return {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict' as const,
    };
  }

  private buildLoginUrl() {
    const frontendUrl = (
      config.frontendUrl || 'https://sidequote.cloud'
    ).replace(/\/+$/, '');

    return `${frontendUrl}/login`;
  }

  private buildEmailVerificationUrl(token: string) {
    const backendUrl = (config.backendUrl || '').replace(/\/+$/, '');
    return `${backendUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
  }

  private async createEmailVerificationToken(user: UserDocument) {
    const token = randomBytes(32).toString('hex');
    user.emailVerificationTokenHash = createHash('sha256')
      .update(token)
      .digest('hex');
    user.emailVerificationExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );
    await user.save();
    return token;
  }

  private async createEmailVerificationTokenForUser(userId: unknown) {
    const user = await this.userModel
      .findById(userId)
      .select('+emailVerificationTokenHash +emailVerificationExpiresAt');
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    return this.createEmailVerificationToken(user);
  }

  private async sendRegistrationConfirmation(
    email: string,
    displayName: string,
    accountType: 'user' | 'businessOwner',
    verificationUrl?: string,
  ) {
    try {
      await sendMailer(
        email,
        `Welcome to SideQuote - Your ${accountType === 'businessOwner' ? 'business ' : ''}account is ready`,
        createRegistrationConfirmationEmailTemplate({
          displayName,
          loginUrl: this.buildLoginUrl(),
          verificationUrl,
          accountType,
        }),
      );
    } catch (error) {
      console.error('Failed to send registration confirmation email:', error);
    }
  }

  private createAuthenticatedSession(user: UserDocument, res: Response) {
    const accessToken = this.jwtService.sign(this.createTokenPayload(user), {
      secret: config.jwt.accessTokenSecret,
      expiresIn: config.jwt.accessTokenExpires as any,
    } as jwt.JwtSignOptions);
    const refreshToken = this.jwtService.sign(this.createTokenPayload(user), {
      secret: config.jwt.refreshTokenSecret,
      expiresIn: config.jwt.refreshTokenExpires as any,
    } as jwt.JwtSignOptions);

    res.cookie('refreshToken', refreshToken, this.buildCookieOptions());

    return { accessToken, user: this.sanitizeUser(user) };
  }

  private async ensureUniqueCredentials(email: string, username?: string) {
    const existingUser = await this.userModel.findOne({
      $or: [
        { email },
        ...(username ? [{ username: username.toLowerCase() }] : []),
      ],
    });

    if (!existingUser) {
      return;
    }

    if (existingUser.email === email) {
      throw new HttpException('User already exists with this email', 400);
    }

    if (username && existingUser.username === username.toLowerCase()) {
      throw new HttpException('Username is already taken', 400);
    }
  }

  private validatePasswordConfirmation(
    password: string,
    confirmPassword: string,
  ) {
    if (password !== confirmPassword) {
      throw new HttpException(
        'Password and confirm password do not match',
        400,
      );
    }
  }

  private validateTermsAcceptance(agreementAccepted: boolean) {
    if (!agreementAccepted) {
      throw new HttpException(
        'You must agree to the terms and conditions',
        400,
      );
    }
  }

  private validatePublicUsername(username?: string) {
    const normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername) {
      return normalizedUsername;
    }

    if (isReservedUsername(normalizedUsername)) {
      throw new HttpException('This username is not available', 400);
    }

    return normalizedUsername;
  }

  private async createAccount(payload: Partial<User>, role: UserRole) {
    const normalizedUsername = this.validatePublicUsername(payload.username);
    await this.ensureUniqueCredentials(payload.email!, normalizedUsername);

    const newUser = await this.userModel.create({
      ...payload,
      username: normalizedUsername,
      role,
      emailVerified: false,
    });

    return this.sanitizeUser(newUser);
  }

  // async register(registerUserDto: CreateAuthDto) {
  //   return this.registerUser(registerUserDto);
  // }

  async registerUser(registerUserDto: RegisterUserDto) {
    this.validatePasswordConfirmation(
      registerUserDto.password,
      registerUserDto.confirmPassword,
    );
    this.validateTermsAcceptance(registerUserDto.agreementAccepted);

    const newUser = await this.createAccount(
      {
        firstName: registerUserDto.firstName,
        lastName: registerUserDto.lastName,
        username: registerUserDto.username,
        email: registerUserDto.email.toLowerCase(),
        phoneNumber: registerUserDto.phoneNumber,
        bio: registerUserDto.bio,
        country: registerUserDto.country,
        state: registerUserDto.state,
        city: registerUserDto.city,
        address: registerUserDto.address,
        postcode: registerUserDto.postcode,
        password: registerUserDto.password,
        agreementAccepted: registerUserDto.agreementAccepted,
        status: 'active',
      },
      'user',
    );

    const verificationToken = await this.createEmailVerificationTokenForUser(
      newUser._id,
    );

    await this.sendRegistrationConfirmation(
      registerUserDto.email.toLowerCase(),
      `${registerUserDto.firstName} ${registerUserDto.lastName}`.trim(),
      'user',
      this.buildEmailVerificationUrl(verificationToken),
    );

    return newUser;
  }

  async registerBusinessOwner(
    registerBusinessOwnerDto: RegisterBusinessOwnerDto,
  ) {
    this.validatePasswordConfirmation(
      registerBusinessOwnerDto.password,
      registerBusinessOwnerDto.confirmPassword,
    );
    this.validateTermsAcceptance(registerBusinessOwnerDto.agreementAccepted);

    const loginEmail =
      registerBusinessOwnerDto.personalEmail ||
      registerBusinessOwnerDto.businessEmail;

    if (!loginEmail) {
      throw new HttpException(
        'Either personal email or business email is required',
        400,
      );
    }

    const serviceCategory =
      await this.serviceCategoryService.resolveCategorySelection(
        registerBusinessOwnerDto.category,
        registerBusinessOwnerDto.requestedCategory,
        'business_registration',
      );
    const isPendingCategory = serviceCategory.status === 'pending';
    const isOtherCategory =
      this.isOtherCategory(registerBusinessOwnerDto.category) &&
      isPendingCategory;

    const newBusinessOwner = await this.createAccount(
      {
        firstName: registerBusinessOwnerDto.ownerName.split(' ')[0],
        lastName: registerBusinessOwnerDto.ownerName
          .split(' ')
          .slice(1)
          .join(' '),
        username: registerBusinessOwnerDto.username.toLowerCase(),
        email: loginEmail.toLowerCase(),
        businessName: registerBusinessOwnerDto.businessName,
        businessEmail: registerBusinessOwnerDto.businessEmail?.toLowerCase(),
        businessWebsiteUrl: registerBusinessOwnerDto.businessWebsiteUrl,
        bio: registerBusinessOwnerDto.bio,
        address: registerBusinessOwnerDto.address,
        serviceArea: registerBusinessOwnerDto.serviceArea,
        category: isOtherCategory
          ? registerBusinessOwnerDto.category
          : serviceCategory.name,
        requestedCategory: isOtherCategory
          ? registerBusinessOwnerDto.requestedCategory
          : null,
        serviceCategoryId: serviceCategory._id,
        state: registerBusinessOwnerDto.state,
        city: registerBusinessOwnerDto.city,
        agreementAccepted: registerBusinessOwnerDto.agreementAccepted,
        password: registerBusinessOwnerDto.password,
        // Business owners are available immediately after registration.
        // Email verification is still required before login.
        status: isPendingCategory ? 'pending' : 'active',
      },
      'businessOwner',
    );

    if (isOtherCategory && isPendingCategory) {
      this.notifyAdminAboutCategoryApproval({
        category: registerBusinessOwnerDto.requestedCategory!,
        name: registerBusinessOwnerDto.ownerName,
        email: loginEmail,
        type: 'New business registration',
      });
    }

    await this.createBusinessProfileService(
      new Types.ObjectId(String(newBusinessOwner._id)),
      registerBusinessOwnerDto.category,
      registerBusinessOwnerDto.requestedCategory,
      serviceCategory,
    );

    const verificationToken = await this.createEmailVerificationTokenForUser(
      newBusinessOwner._id,
    );

    await this.sendRegistrationConfirmation(
      loginEmail.toLowerCase(),
      registerBusinessOwnerDto.ownerName,
      'businessOwner',
      this.buildEmailVerificationUrl(verificationToken),
    );

    return newBusinessOwner;
  }

  async registerBusinessOwnerForExistingUser(
    userId: string,
    registerBusinessOwnerDto: RegisterExistingUserBusinessOwnerDto,
    res: Response,
  ) {
    const existingUser = await this.userModel.findById(userId);

    if (!existingUser) {
      throw new HttpException('User not found', 404);
    }

    if (existingUser.role === 'businessOwner') {
      if (existingUser.status === 'pending' && existingUser.requestedCategory) {
        throw new HttpException(
          `Your requested Other category "${existingUser.requestedCategory}" is currently subject to admin review. Please wait for approval before requesting another category or creating a new business profile.`,
          409,
        );
      }

      throw new HttpException('User already has a business owner account', 400);
    }

    if (existingUser.status === 'rejected') {
      throw new HttpException('Your account has been rejected by admin', 403);
    }

    if (existingUser.status === 'suspended') {
      throw new HttpException('Your account has been suspended', 403);
    }

    if (!existingUser.emailVerified) {
      throw new HttpException(
        'Please verify your email address before creating a business account',
        403,
      );
    }

    const serviceCategory =
      await this.serviceCategoryService.resolveCategorySelection(
        registerBusinessOwnerDto.category,
        registerBusinessOwnerDto.requestedCategory,
        'business_registration',
        userId,
      );
    const isPendingCategory = serviceCategory.status === 'pending';
    const isOtherCategory =
      this.isOtherCategory(registerBusinessOwnerDto.category) &&
      isPendingCategory;

    const businessDetails = Object.fromEntries(
      Object.entries({
        businessName: registerBusinessOwnerDto.businessName,
        businessEmail: registerBusinessOwnerDto.businessEmail?.toLowerCase(),
        businessWebsiteUrl: registerBusinessOwnerDto.businessWebsiteUrl,
        bio: registerBusinessOwnerDto.bio,
        address: registerBusinessOwnerDto.address,
        serviceArea: registerBusinessOwnerDto.serviceArea,
        category: isOtherCategory
          ? registerBusinessOwnerDto.category
          : serviceCategory.name,
        requestedCategory: isOtherCategory
          ? registerBusinessOwnerDto.requestedCategory
          : null,
        serviceCategoryId: serviceCategory._id,
        state: registerBusinessOwnerDto.state,
        city: registerBusinessOwnerDto.city,
        role: 'businessOwner',
        status: isPendingCategory ? 'pending' : 'active',
      }).filter(([, value]) => value !== undefined),
    );

    const updatedUser = await this.userModel.findByIdAndUpdate(
      existingUser._id,
      businessDetails,
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      throw new HttpException('User not found', 404);
    }

    if (isOtherCategory && isPendingCategory) {
      this.notifyAdminAboutCategoryApproval({
        category: registerBusinessOwnerDto.requestedCategory!,
        name:
          [updatedUser.firstName, updatedUser.lastName]
            .filter(Boolean)
            .join(' ') ||
          updatedUser.username ||
          updatedUser.email,
        email: updatedUser.email,
        type: 'Business profile creation',
      });
    }

    await this.createBusinessProfileService(
      updatedUser._id,
      registerBusinessOwnerDto.category,
      registerBusinessOwnerDto.requestedCategory,
      serviceCategory,
    );

    // await this.sendRegistrationConfirmation(
    //   updatedUser.email,
    //   [updatedUser.firstName, updatedUser.lastName].filter(Boolean).join(' ') ||
    //     updatedUser.username ||
    //     updatedUser.email,
    //   'businessOwner',
    // );

    return this.createAuthenticatedSession(updatedUser, res);
  }

  async login(loginDto: LoginAuthDto, res: Response) {
    const identifier = (loginDto.identifier || loginDto.email)
      ?.trim()
      .toLowerCase();

    if (!identifier) {
      throw new HttpException('Email or username is required', 400);
    }

    const isEmailLogin = identifier.includes('@');

    if (isEmailLogin && !isEmail(identifier)) {
      throw new HttpException('Valid email is required', 400);
    }

    if (!isEmailLogin && !USERNAME_REGEX.test(identifier)) {
      throw new HttpException(
        'Username must be 3-30 characters and use only lowercase letters, numbers, underscores, or hyphens',
        400,
      );
    }

    const user = await this.userModel
      .findOne(isEmailLogin ? { email: identifier } : { username: identifier })
      .select('+password');
    if (!user) {
      throw new HttpException('User not found', 404);
    }

    const isPasswordMatch = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordMatch) {
      throw new HttpException('Incorrect password', 401);
    }

    if (user.status === 'rejected') {
      throw new HttpException(
        'Your registration request was rejected by admin',
        403,
      );
    }

    if (user.status === 'suspended') {
      throw new HttpException('Your account has been suspended', 403);
    }

    if (!user.emailVerified) {
      throw new HttpException(
        'Please verify your email address before logging in',
        403,
      );
    }

    return this.createAuthenticatedSession(user, res);
  }

  async verifyRegistrationEmail(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await this.userModel
      .findOne({
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: { $gt: new Date() },
      })
      .select('+emailVerificationTokenHash +emailVerificationExpiresAt');

    if (!user) {
      throw new HttpException('Invalid or expired verification link', 400);
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
  }

  private async findUserByEmailOrUsername(identifier: string) {
    const normalizedIdentifier = identifier.trim().toLowerCase();

    if (!normalizedIdentifier) {
      throw new HttpException('Email or username is required', 400);
    }

    const isEmailIdentifier = normalizedIdentifier.includes('@');

    if (isEmailIdentifier && !isEmail(normalizedIdentifier)) {
      throw new HttpException('Valid email is required', 400);
    }

    if (!isEmailIdentifier && !USERNAME_REGEX.test(normalizedIdentifier)) {
      throw new HttpException(
        'Username must be 3-30 characters and use only lowercase letters, numbers, underscores, or hyphens',
        400,
      );
    }

    return this.userModel.findOne(
      isEmailIdentifier
        ? { email: normalizedIdentifier }
        : { username: normalizedIdentifier },
    );
  }

  async resendVerificationEmail(email: string) {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new HttpException('User not found', 404);
    }

    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    const verificationToken = await this.createEmailVerificationTokenForUser(
      user._id,
    );
    await this.sendRegistrationConfirmation(
      user.email,
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        user.username ||
        user.email,
      user.role === 'businessOwner' ? 'businessOwner' : 'user',
      this.buildEmailVerificationUrl(verificationToken),
    );

    return { message: 'Check your email for the verification link' };
  }

  async forgotPassword(identifier: string) {
    const user = await this.findUserByEmailOrUsername(identifier);
    if (!user) throw new HttpException('User not found', 404);

    const generateOtpNumber = Math.floor(100000 + Math.random() * 900000);

    user.otp = generateOtpNumber.toString();
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const emailTemplate = {
      subject: 'Reset Password OTP',
      html: createForgotPasswordEmailTemplate({
        otp: generateOtpNumber,
        expiryMinutes: 10,
      }),
    };

    await sendMailer(user.email, emailTemplate.subject, emailTemplate.html);

    return { message: 'Check your email for OTP' };
  }

  async verifyEmail(identifier: string, otp: string) {
    const user = await this.findUserByEmailOrUsername(identifier);
    if (!user) throw new HttpException('Invalid link', 400);

    if (user.otp !== otp) throw new HttpException('Invalid OTP', 400);
    if (!user.otpExpiry) throw new HttpException('Invalid OTP', 400);

    if (user.otpExpiry < new Date()) {
      throw new HttpException('OTP expired', 400);
    }

    user.otp = undefined as any;
    user.otpExpiry = undefined as any;
    user.verifiedForget = true;

    await user.save();

    return { message: 'OTP verified successfully' };
  }

  async resetPasswordChange(identifier: string, newPassword: string) {
    const user = await this.findUserByEmailOrUsername(identifier);
    if (!user) throw new HttpException('Invalid link', 400);

    if (!user.verifiedForget) {
      throw new HttpException('Invalid link', 400);
    }

    user.password = newPassword;
    user.verifiedForget = false;
    await user.save();

    return { message: 'Password reset successfully' };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.userModel.findById(userId).select('+password');
    if (!user) throw new HttpException('User not found', 404);
    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) throw new HttpException('Invalid old password', 400);

    if (oldPassword === newPassword)
      throw new HttpException(
        'New password cannot be same as old password',
        400,
      );

    user.password = newPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }
}
