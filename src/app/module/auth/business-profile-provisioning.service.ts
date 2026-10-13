import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  getAccountStatus,
  getAvailableRoles,
  getBusinessProfile,
  hasProfileRole,
  toPlainProfile,
} from 'src/app/helpers/account-profile';
import {
  BusinessService,
  BusinessServiceDocument,
} from '../service/entities/service.entity';
import { User, UserDocument } from '../user/entities/user.entity';

export type BusinessProfileProvisioningInput = {
  businessName: string;
  ownerName: string;
  businessEmail: string;
  businessWebsiteUrl?: string;
  serviceArea?: string;
  phoneNumber?: string;
  country?: string;
  city: string;
  state: string;
  address?: string;
  postcode?: string;
  profilePicture?: string;
  bio?: string;
  category: string;
  requestedCategory?: string | null;
  serviceCategoryId: Types.ObjectId;
  status: 'active' | 'pending';
  keywords?: string[];
  sourceReferralId?: Types.ObjectId;
};

type ProvisioningOptions = {
  allowExistingBusinessProfile?: boolean;
  session?: ClientSession;
};

@Injectable()
export class BusinessProfileProvisioningService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(BusinessService.name)
    private readonly businessServiceModel: Model<BusinessServiceDocument>,
  ) {}

  private normalize(value?: string) {
    return value?.trim().toLowerCase();
  }

  private normalizeKeywords(keywords?: string[]) {
    return [
      ...new Set(
        (keywords ?? [])
          .map((keyword) => keyword.trim().replace(/\s+/g, ' ').toLowerCase())
          .filter(Boolean),
      ),
    ];
  }

  async provisionForExistingAccount(
    userId: string | Types.ObjectId,
    input: BusinessProfileProvisioningInput,
    options: ProvisioningOptions = {},
  ) {
    const userQuery = this.userModel.findById(userId);
    if (options.session) userQuery.session(options.session);
    const user = await userQuery;

    if (!user) throw new HttpException('User not found', 404);
    const accountStatus = getAccountStatus(user);
    if (accountStatus === 'rejected' || accountStatus === 'suspended') {
      throw new HttpException('Your account is not active', 403);
    }

    const alreadyBusinessOwner = hasProfileRole(user, 'businessOwner');
    const existingProfile = getBusinessProfile(user);
    if (alreadyBusinessOwner && !options.allowExistingBusinessProfile) {
      throw new HttpException('User already has a business owner account', 409);
    }
    if (
      alreadyBusinessOwner &&
      existingProfile.businessEmail &&
      this.normalize(existingProfile.businessEmail) !==
        this.normalize(input.businessEmail)
    ) {
      throw new HttpException(
        'Your existing business profile uses a different business email',
        409,
      );
    }

    const serviceQuery = this.businessServiceModel.findOne({
      ownerId: user._id,
      serviceCategoryId: input.serviceCategoryId,
    });
    if (options.session) serviceQuery.session(options.session);
    let businessService = await serviceQuery;
    let createdBusinessServiceId: Types.ObjectId | undefined;

    if (!businessService) {
      const createdServices = await this.businessServiceModel.create(
        [
          {
            ownerId: user._id,
            title: input.category,
            requestedCategory: input.requestedCategory ?? null,
            serviceCategoryId: input.serviceCategoryId,
            keywords: this.normalizeKeywords(input.keywords),
            description: `${input.category} service`,
            status: input.status,
          },
        ],
        options.session ? { session: options.session } : {},
      );
      businessService = createdServices[0];
      createdBusinessServiceId = businessService._id;
    }

    const businessProfile = {
      ...(alreadyBusinessOwner ? toPlainProfile(existingProfile) : {}),
      ...Object.fromEntries(
        Object.entries({
          sourceReferralId: input.sourceReferralId,
          businessName: input.businessName,
          ownerName: input.ownerName,
          businessEmail: input.businessEmail.toLowerCase(),
          businessWebsiteUrl: input.businessWebsiteUrl,
          serviceArea: input.serviceArea,
          category: input.category,
          requestedCategory: input.requestedCategory ?? null,
          serviceCategoryId: input.serviceCategoryId,
          phoneNumber: input.phoneNumber,
          country: input.country,
          city: input.city,
          state: input.state,
          address: input.address,
          postcode: input.postcode,
          profilePicture: input.profilePicture,
          bio: input.bio,
          status: input.status,
        }).filter(([, value]) => value !== undefined),
      ),
    };

    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        user._id,
        {
          $set: { businessProfile },
          $addToSet: {
            roles: {
              $each: [...getAvailableRoles(user), 'businessOwner'],
            },
          },
        },
        { new: true, runValidators: true, session: options.session },
      );

      if (!updatedUser) throw new HttpException('User not found', 404);
      return { user: updatedUser, businessService };
    } catch (error) {
      if (createdBusinessServiceId && !options.session) {
        await this.businessServiceModel
          .findByIdAndDelete(createdBusinessServiceId)
          .catch(() => undefined);
      }
      throw error;
    }
  }
}
