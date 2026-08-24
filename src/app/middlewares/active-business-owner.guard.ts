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
      .select('role status requestedCategory');

    if (!businessOwner || businessOwner.role !== 'businessOwner') {
      throw new HttpException('Unauthorized', 401);
    }

    if (businessOwner.status === 'pending') {
      const requestedCategory = businessOwner.requestedCategory?.trim();

      throw new HttpException(
        requestedCategory
          ? `Your requested Other category "${requestedCategory}" is currently subject to admin review. You can add services and gallery items after the category is approved.`
          : 'Your business account is currently pending admin review. You can add services and gallery items after it is approved.',
        403,
      );
    }

    if (businessOwner.status === 'rejected') {
      throw new HttpException(
        'Your business account has been rejected and cannot add services or gallery items. Please contact support for assistance.',
        403,
      );
    }

    if (businessOwner.status === 'suspended') {
      throw new HttpException(
        'Your business account is suspended and cannot add services or gallery items. Please contact support for assistance.',
        403,
      );
    }

    if (businessOwner.status !== 'active') {
      throw new HttpException(
        'Your business account must be active before adding services or gallery items.',
        403,
      );
    }

    return true;
  }
}
