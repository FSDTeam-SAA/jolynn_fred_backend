import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model } from 'mongoose';
import { User, UserDocument } from '../module/user/entities/user.entity';

@Injectable()
export class ActiveBusinessOwnerGuard implements CanActivate {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new HttpException('Unauthorized', 401);
    }

    if (user.role !== 'businessOwner') {
      return true;
    }

    const businessOwner = await this.userModel
      .findById(user.id)
      .select('role status');

    if (!businessOwner || businessOwner.role !== 'businessOwner') {
      throw new HttpException('Unauthorized', 401);
    }

    if (businessOwner.status !== 'active') {
      throw new HttpException('Business owner account must be active', 403);
    }

    return true;
  }
}
