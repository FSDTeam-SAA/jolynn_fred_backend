import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  mixin,
  Type,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import config from '../config';
import { type UserRole } from '../constants/auth.constants';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../module/user/entities/user.entity';
import { getAccountStatus, hasProfileRole } from '../helpers/account-profile';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export default function AuthGuard(...roles: UserRole[]): Type<CanActivate> {
  @Injectable()
  class AuthGuardImpl implements CanActivate {
    constructor(
      readonly jwtService: JwtService,
      @InjectModel(User.name)
      readonly userModel: Model<UserDocument>,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest<Request>();
      const token = request.headers.authorization?.split(' ')[1];
      if (!token) throw new HttpException('Unauthorized', 401);

      const decoded = this.jwtService.verify<JwtPayload>(token, {
        secret: config.jwt.accessTokenSecret!,
      });
      if (!decoded) throw new HttpException('Unauthorized', 401);

      if (roles.length && !roles.includes(decoded.role)) {
        throw new HttpException('Forbidden', 403);
      }

      const account = await this.userModel
        .findById(decoded.id)
        .select('role roles status accountStatus businessProfile.status');
      if (!account) {
        throw new HttpException('Unauthorized', 401);
      }
      const accountStatus = getAccountStatus(account);
      if (accountStatus === 'rejected' || accountStatus === 'suspended') {
        throw new HttpException('Your account is not active', 403);
      }
      if (!hasProfileRole(account, decoded.role)) {
        throw new HttpException('Profile is no longer available', 403);
      }
      request.user = decoded;
      return true;
    }
  }
  return mixin(AuthGuardImpl);
}
