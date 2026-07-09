import { HttpException, Injectable } from '@nestjs/common';
import {
  CreateAuthDto,
  LoginAuthDto,
  RegisterBusinessOwnerDto,
  RegisterUserDto,
} from './dto/create-auth.dto';
import { User, UserDocument } from '../user/entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from '@nestjs/jwt';
import config from '../../config';
import sendMailer from 'src/app/helpers/sendMailer';
import { createForgotPasswordEmailTemplate } from 'src/app/helpers/template';
import { type UserRole } from 'src/app/constants/auth.constants';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: jwt.JwtService,
  ) {}

 

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

  private async ensureUniqueCredentials(email: string, username?: string) {
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, ...(username ? [{ username: username.toLowerCase() }] : [])],
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
      throw new HttpException('Password and confirm password do not match', 400);
    }
  }

  private validateTermsAcceptance(agreementAccepted: boolean) {
    if (!agreementAccepted) {
      throw new HttpException('You must agree to the terms and conditions', 400);
    }
  }

  private async createAccount(payload: Partial<User>, role: UserRole) {
    await this.ensureUniqueCredentials(payload.email!, payload.username);

    const newUser = await this.userModel.create({
      ...payload,
      role,
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

return this.createAccount(
  {
    firstName: registerUserDto.firstName,
    lastName: registerUserDto.lastName,
    username: registerUserDto.username.toLowerCase(),
    email: registerUserDto.email.toLowerCase(),
    phoneNumber: registerUserDto.phoneNumber,
    password: registerUserDto.password,
    agreementAccepted: registerUserDto.agreementAccepted,
  },
  'user',
);
  }

  async registerBusinessOwner(
    registerBusinessOwnerDto: RegisterBusinessOwnerDto,
  ) {
    this.validatePasswordConfirmation(
      registerBusinessOwnerDto.password,
      registerBusinessOwnerDto.confirmPassword,
    );
    this.validateTermsAcceptance(registerBusinessOwnerDto.agreementAccepted);

    return this.createAccount(
      {
        firstName: registerBusinessOwnerDto.ownerName.split(' ')[0],
        lastName: registerBusinessOwnerDto.ownerName.split(' ').slice(1).join(' '),
        username: registerBusinessOwnerDto.username.toLowerCase(),
        email: registerBusinessOwnerDto.personalEmail.toLowerCase(),
        businessName: registerBusinessOwnerDto.businessName,
        businessEmail: registerBusinessOwnerDto.businessEmail?.toLowerCase(),
        businessWebsiteUrl: registerBusinessOwnerDto.businessWebsiteUrl,
        address: registerBusinessOwnerDto.address,
        serviceArea: registerBusinessOwnerDto.serviceArea,
        category: registerBusinessOwnerDto.category,
        state: registerBusinessOwnerDto.state,
        city: registerBusinessOwnerDto.city,
        agreementAccepted: registerBusinessOwnerDto.agreementAccepted,
        password: registerBusinessOwnerDto.password,
        status: 'pending',
      },
      'businessOwner',
    );
  }

  async login(loginDto: LoginAuthDto, res: Response) {
    const identifier = loginDto.identifier ?? loginDto.email;
    if (!identifier) {
      throw new HttpException('Email or username is required', 400);
    }

    const user = await this.userModel
      .findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() },
        ],
      })
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

    // if (user.status === 'pending') {
    //   throw new HttpException(
    //     'Your registration is pending admin approval',
    //     403,
    //   );
    // }

    if (user.status === 'rejected') {
      throw new HttpException(
        'Your registration request was rejected by admin',
        403,
      );
    }

    if (user.status === 'suspended') {
      throw new HttpException('Your account has been suspended', 403);
    }


    const accessToken = this.jwtService.sign(
      this.createTokenPayload(user),
      {
        secret: config.jwt.accessTokenSecret,
        expiresIn: config.jwt.accessTokenExpires as any,
      } as jwt.JwtSignOptions,
    );
    const refreshToken = this.jwtService.sign(
      this.createTokenPayload(user),
      {
        secret: config.jwt.refreshTokenSecret,
        expiresIn: config.jwt.refreshTokenExpires as any,
      } as jwt.JwtSignOptions,
    );
    res.cookie('refreshToken', refreshToken, this.buildCookieOptions());

    return { accessToken, user: this.sanitizeUser(user) };
  }

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new HttpException('Email not found', 404);

    const generateOtpNumber = Math.floor(100000 + Math.random() * 900000);

    user.otp = generateOtpNumber.toString();
    user.otpExpiry = new Date(Date.now() + 60 * 60 * 1000);
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

  async verifyEmail(email: string, otp: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new HttpException('Invalid link', 400);

    if (user.otp !== otp) throw new HttpException('Invalid OTP', 400);
    if (!user.otpExpiry) throw new HttpException('Invalid OTP', 400);
    const todayDate = new Date();
    if (user.otpExpiry < todayDate) throw new HttpException('OTP expired', 400);

    user.otp = undefined as any;
    user.otpExpiry = undefined as any;

    user.verifiedForget = true;
    await user.save();
    if (!user.verifiedForget) throw new HttpException('Invalid link', 400);

    return { message: 'OTP verified successfully' };
  }

  async resetPasswordChange(email: string, newPassword: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new HttpException('Invalid link', 400);

    if (!user.verifiedForget) throw new HttpException('Invalid link', 400);

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
