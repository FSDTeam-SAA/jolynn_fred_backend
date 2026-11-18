import { HttpException, Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { fileUpload } from 'src/app/helpers/fileUploder';
import {
  businessOwnerMembershipFilter,
  getBusinessProfile,
  getPersonalProfile,
  hasProfileRole,
} from 'src/app/helpers/account-profile';
import { buildPublicProfileUrl } from 'src/app/helpers/profile-url';
import { LocationService } from '../location/location.service';
import {
  ServiceCategory,
  ServiceCategoryDocument,
} from '../service-category/entities/service-category.entity';
import { User, UserDocument } from '../user/entities/user.entity';
import { CreateBusinessReferralDto } from './dto/create-business-referral.dto';
import { MyBusinessReferralsQueryDto } from './dto/my-business-referrals-query.dto';
import { SearchBusinessReferralsDto } from './dto/search-business-referrals.dto';
import { UpdateReferralEmailDto } from './dto/update-referral-email.dto';
import {
  BusinessClaim,
  BusinessClaimDocument,
} from './entities/business-claim.entity';
import { Review, ReviewDocument } from '../reviews/entities/review.entity';
import {
  BusinessReferral,
  BusinessReferralDocument,
} from './entities/business-referral.entity';
import { BusinessReferralNotificationService } from './business-referral-notification.service';
import {
  BUSINESS_REFERRAL_IMAGE_MAX_COUNT,
  BUSINESS_REFERRAL_IMAGE_MAX_SIZE,
  type BusinessReferralSource,
} from './constants/business-referral.constants';

type ReferralListOptions = {
  includePrivate?: boolean;
  referredByUserId?: Types.ObjectId;
  forAdmin?: boolean;
};

@Injectable()
export class BusinessReferralService {
  constructor(
    @InjectModel(BusinessReferral.name)
    private readonly businessReferralModel: Model<BusinessReferralDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(ServiceCategory.name)
    private readonly serviceCategoryModel: Model<ServiceCategoryDocument>,
    private readonly locationService: LocationService,
    private readonly notificationService: BusinessReferralNotificationService,
    @Optional()
    @InjectModel(BusinessClaim.name)
    private readonly businessClaimModel?: Model<BusinessClaimDocument>,
    @Optional()
    @InjectModel(Review.name)
    private readonly reviewModel?: Model<ReviewDocument>,
  ) {}

  private toObjectId(id: string, label: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, 400);
    }
    return new Types.ObjectId(id);
  }

  private normalizeIdentity(value: string) {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private normalizePhone(value?: string) {
    if (!value) return undefined;
    const normalized = value.replace(/\D/g, '');
    return normalized || undefined;
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private exactRegex(value: string) {
    return new RegExp(`^${this.escapeRegex(value.trim())}$`, 'i');
  }

  private phoneRegex(value: string) {
    return new RegExp(`^\\D*${value.split('').join('\\D*')}\\D*$`);
  }

  private async getCreatorOrThrow(
    userId: string,
    source: BusinessReferralSource,
  ) {
    const user = await this.userModel.findById(
      this.toObjectId(userId, 'referrer id'),
    );

    const requiredRole = source === 'admin' ? 'admin' : 'user';
    if (!user || !hasProfileRole(user, requiredRole)) {
      throw new HttpException(
        source === 'admin'
          ? 'Administrator account not found'
          : 'Personal user profile not found',
        404,
      );
    }

    return user;
  }

  private async getApprovedCategoryOrThrow(categoryId: string) {
    const category = await this.serviceCategoryModel.findOne({
      _id: this.toObjectId(categoryId, 'service category id'),
      status: 'approved',
      isActive: true,
    });

    if (!category) {
      throw new HttpException(
        'Please select an approved active service category',
        400,
      );
    }

    return category;
  }

  private async uploadReferralImages(imageFiles: Express.Multer.File[] = []) {
    if (imageFiles.length > BUSINESS_REFERRAL_IMAGE_MAX_COUNT) {
      throw new HttpException(
        `You can upload a maximum of ${BUSINESS_REFERRAL_IMAGE_MAX_COUNT} business images`,
        400,
      );
    }
    if (
      imageFiles.some(
        (file) =>
          !file.mimetype?.startsWith('image/') ||
          !file.buffer?.length ||
          file.size > BUSINESS_REFERRAL_IMAGE_MAX_SIZE,
      )
    ) {
      throw new HttpException(
        `Each file must be an image no larger than ${BUSINESS_REFERRAL_IMAGE_MAX_SIZE / (1024 * 1024)} MB`,
        400,
      );
    }

    const uploadedImages: Array<{ url: string; public_id: string }> = [];
    try {
      for (const imageFile of imageFiles) {
        uploadedImages.push(
          await fileUpload.uploadBusinessReferralImage(imageFile),
        );
      }
      return uploadedImages;
    } catch (error) {
      await Promise.allSettled(
        uploadedImages.map((image) =>
          fileUpload.deleteResourceFromCloudinary(image.public_id),
        ),
      );
      throw error;
    }
  }

  private async ensureNoStrongDuplicate(
    input: {
      businessName: string;
      businessEmail: string;
      businessPhone?: string;
      state: string;
      city: string;
    },
    excludeReferralId?: Types.ObjectId,
  ) {
    const normalizedBusinessName = this.normalizeIdentity(input.businessName);
    const normalizedState = this.normalizeIdentity(input.state);
    const normalizedCity = this.normalizeIdentity(input.city);
    const duplicateConditions: Record<string, unknown>[] = [
      { businessEmail: input.businessEmail },
      { normalizedBusinessName, normalizedState, normalizedCity },
    ];

    if (input.businessPhone) {
      duplicateConditions.push({ businessPhone: input.businessPhone });
    }

    const referralDuplicate = await this.businessReferralModel
      .findOne({
        ...(excludeReferralId ? { _id: { $ne: excludeReferralId } } : {}),
        $or: duplicateConditions,
      })
      .select(
        'businessName slug claimStatus businessEmail businessPhone normalizedBusinessName normalizedState normalizedCity',
      )
      .lean();

    if (referralDuplicate) {
      const emailMatches =
        Boolean(input.businessEmail) &&
        Boolean(referralDuplicate.businessEmail) &&
        referralDuplicate.businessEmail?.toLowerCase() ===
          input.businessEmail.toLowerCase();
      const phoneMatches =
        Boolean(input.businessPhone) &&
        Boolean(referralDuplicate.businessPhone) &&
        referralDuplicate.businessPhone === input.businessPhone;

      if (emailMatches) {
        throw new HttpException(
          `This email (${input.businessEmail}) already has a referral profile (${referralDuplicate.businessName})`,
          409,
        );
      }
      if (phoneMatches) {
        throw new HttpException(
          `This phone number (${input.businessPhone}) already has a referral profile (${referralDuplicate.businessName})`,
          409,
        );
      }
      throw new HttpException(
        `This business name already has a referral profile in this city (${referralDuplicate.businessName})`,
        409,
      );
    }

    const nameRegex = this.exactRegex(input.businessName);
    const stateRegex = this.exactRegex(input.state);
    const cityRegex = this.exactRegex(input.city);
    const registeredBusinessConditions: Record<string, unknown>[] = [
      { 'businessProfile.businessEmail': input.businessEmail },
      { businessEmail: input.businessEmail },
      {
        'businessProfile.businessName': { $regex: nameRegex },
        'businessProfile.state': { $regex: stateRegex },
        'businessProfile.city': { $regex: cityRegex },
      },
      {
        businessProfile: { $exists: false },
        businessName: { $regex: nameRegex },
        state: { $regex: stateRegex },
        city: { $regex: cityRegex },
      },
    ];

    if (input.businessPhone) {
      const phoneRegex = this.phoneRegex(input.businessPhone);
      registeredBusinessConditions.push(
        { 'businessProfile.phoneNumber': { $regex: phoneRegex } },
        { phoneNumber: { $regex: phoneRegex } },
      );
    }

    const registeredDuplicate = await this.userModel
      .findOne({
        $and: [
          businessOwnerMembershipFilter,
          { $or: registeredBusinessConditions },
        ],
      })
      .select(
        'businessProfile.businessName businessProfile.businessEmail businessProfile.phoneNumber businessName businessEmail email phoneNumber username',
      )
      .lean();

    if (registeredDuplicate) {
      const regBusinessName =
        registeredDuplicate.businessProfile?.businessName ||
        registeredDuplicate.businessName ||
        'Existing business';
      const regEmail =
        registeredDuplicate.businessProfile?.businessEmail ||
        registeredDuplicate.businessEmail ||
        registeredDuplicate.email;
      const regPhone =
        registeredDuplicate.businessProfile?.phoneNumber ||
        registeredDuplicate.phoneNumber;

      if (
        regEmail &&
        regEmail.toLowerCase() === input.businessEmail.toLowerCase()
      ) {
        throw new HttpException(
          `This email (${input.businessEmail}) already has a registered business profile (${regBusinessName})`,
          409,
        );
      }
      if (
        input.businessPhone &&
        regPhone &&
        this.normalizePhone(regPhone) === input.businessPhone
      ) {
        throw new HttpException(
          `This phone number (${input.businessPhone}) already has a registered business profile (${regBusinessName})`,
          409,
        );
      }
      throw new HttpException(
        `This business already has a registered business profile (${regBusinessName})`,
        409,
      );
    }
  }

  private async createUniqueSlug(businessName: string, city: string) {
    const base = `${businessName}-${city}`
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = `${base || 'business'}-${randomBytes(4).toString('hex')}`;
      if (!(await this.businessReferralModel.exists({ slug }))) return slug;
    }

    throw new HttpException('Unable to generate a unique business URL', 500);
  }

  private mapReferral(
    referral: BusinessReferralDocument | Record<string, any>,
    includePrivate = false,
  ) {
    const raw: Record<string, any> =
      typeof (referral as BusinessReferralDocument).toObject === 'function'
        ? ((referral as BusinessReferralDocument).toObject() as Record<
            string,
            any
          >)
        : (referral as Record<string, any>);
    const id = String(raw._id);

    return {
      id,
      listingId: id,
      listingType: 'referred' as const,
      slug: raw.slug,
      profileUrl: `/business-referrals/${raw.slug}`,
      businessName: raw.businessName,
      businessEmail: raw.businessEmail,
      businessPhone: raw.businessPhone,
      image: raw.images?.[0]?.url ?? raw.image?.url,
      images: (raw.images?.length ? raw.images : raw.image ? [raw.image] : [])
        .map((image: { url?: string }) => image.url)
        .filter(Boolean),
      serviceCategoryId: String(
        raw.serviceCategoryId?._id ?? raw.serviceCategoryId,
      ),
      category: raw.categoryName,
      state: raw.state,
      city: raw.city,
      rating: raw.rating,
      totalReviews: 1,
      review: raw.review,
      source: raw.source ?? 'customer',
      listingStatus: raw.listingStatus,
      claimStatus: raw.claimStatus,
      isVerified: raw.claimStatus === 'claimed',
      isClaimable:
        raw.listingStatus === 'published' && raw.claimStatus === 'unclaimed',
      businessOwnerId: raw.claimedByUserId
        ? String(raw.claimedByUserId?._id ?? raw.claimedByUserId)
        : undefined,
      referredBy: {
        id: raw.referredByUserId
          ? String(raw.referredByUserId?._id ?? raw.referredByUserId)
          : undefined,
        name: raw.referrerName,
        avatar: raw.referrerAvatar,
      },
      claimedAt: raw.claimedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      ...(includePrivate
        ? {
            emailDeliveryStatus: raw.emailDeliveryStatus,
            emailDeliveryAttempts: raw.emailDeliveryAttempts,
            emailLastAttemptAt: raw.emailLastAttemptAt,
          }
        : {}),
    };
  }

  private buildListFilter(
    query: SearchBusinessReferralsDto | MyBusinessReferralsQueryDto,
    options: ReferralListOptions,
  ) {
    const filter: Record<string, any> = options.referredByUserId
      ? { referredByUserId: options.referredByUserId }
      : options.forAdmin
        ? {}
        : { listingStatus: 'published' };

    if (query.claimStatus) filter.claimStatus = query.claimStatus;
    if (query.serviceCategoryId) {
      filter.serviceCategoryId = this.toObjectId(
        query.serviceCategoryId,
        'service category id',
      );
    }
    if (query.category) filter.categoryName = this.exactRegex(query.category);
    if (query.state) filter.state = this.exactRegex(query.state);
    if (query.city) filter.city = this.exactRegex(query.city);
    if (query.minimumRating !== undefined) {
      filter.rating = { $gte: query.minimumRating };
    }
    if (query.searchTerm) {
      const regex = new RegExp(this.escapeRegex(query.searchTerm), 'i');
      filter.$or = [
        { businessName: { $regex: regex } },
        { businessEmail: { $regex: regex } },
        { categoryName: { $regex: regex } },
        { state: { $regex: regex } },
        { city: { $regex: regex } },
      ];
    }
    const location = (
      query as SearchBusinessReferralsDto & {
        location?: string;
      }
    ).location;
    if (location) {
      const regex = new RegExp(this.escapeRegex(location), 'i');
      const locationCondition = {
        $or: [{ state: { $regex: regex } }, { city: { $regex: regex } }],
      };
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, locationCondition];
        delete filter.$or;
      } else {
        filter.$or = locationCondition.$or;
      }
    }
    if (
      options.includePrivate &&
      query instanceof MyBusinessReferralsQueryDto &&
      query.emailDeliveryStatus
    ) {
      filter.emailDeliveryStatus = query.emailDeliveryStatus;
    }

    return filter;
  }

  private async listReferrals(
    query: SearchBusinessReferralsDto | MyBusinessReferralsQueryDto,
    options: ReferralListOptions = {},
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const filter = this.buildListFilter(query, options);

    const [total, referrals] = await Promise.all([
      this.businessReferralModel.countDocuments(filter),
      this.businessReferralModel
        .find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return {
      meta: { page, limit, total },
      data: referrals.map((referral) =>
        this.mapReferral(referral, options.includePrivate),
      ),
    };
  }

  async createReferral(
    creatorId: string,
    dto: CreateBusinessReferralDto,
    imageFiles: Express.Multer.File[] = [],
    source: BusinessReferralSource = 'customer',
  ) {
    const businessPhone = this.normalizePhone(dto.businessPhone);
    const [creator, category, location] = await Promise.all([
      this.getCreatorOrThrow(creatorId, source),
      this.getApprovedCategoryOrThrow(dto.serviceCategoryId),
      this.locationService.validateStateAndCity(dto.state, dto.city),
    ]);

    await this.ensureNoStrongDuplicate({
      businessName: dto.businessName,
      businessEmail: dto.businessEmail,
      businessPhone,
      state: location.state,
      city: location.city,
    });

    const uploadedImages = await this.uploadReferralImages(imageFiles);
    const referralImages = uploadedImages.map((image) => ({
      url: image.url,
      publicId: image.public_id,
    }));

    try {
      const personalProfile =
        source === 'customer' ? getPersonalProfile(creator) : undefined;
      const referral = await this.businessReferralModel.create({
        businessName: dto.businessName,
        normalizedBusinessName: this.normalizeIdentity(dto.businessName),
        normalizedState: this.normalizeIdentity(location.state),
        normalizedCity: this.normalizeIdentity(location.city),
        slug: await this.createUniqueSlug(dto.businessName, location.city),
        serviceCategoryId: category._id,
        categoryName: category.name,
        state: location.state,
        city: location.city,
        businessEmail: dto.businessEmail,
        businessPhone,
        ...(referralImages[0] ? { image: referralImages[0] } : {}),
        images: referralImages,
        rating: dto.rating,
        review: dto.review,
        source,
        createdByUserId: creator._id,
        ...(source === 'customer'
          ? {
              referredByUserId: creator._id,
              referrerName:
                [personalProfile?.firstName, personalProfile?.lastName]
                  .filter(Boolean)
                  .join(' ') ||
                creator.username ||
                'Community member',
              referrerAvatar: personalProfile?.profilePicture,
            }
          : { referrerName: 'SideQuote Admin' }),
        listingStatus: 'published',
        claimStatus: 'unclaimed',
        emailDeliveryStatus: 'pending',
      });

      const notifiedReferral = await this.notificationService
        .sendClaimNotification(referral._id)
        .catch(() => null);

      return this.mapReferral(notifiedReferral ?? referral, true);
    } catch (error) {
      await Promise.allSettled(
        uploadedImages.map((image) =>
          fileUpload.deleteResourceFromCloudinary(image.public_id),
        ),
      );
      throw error;
    }
  }

  async getPublicReferrals(query: SearchBusinessReferralsDto) {
    return this.listReferrals(query);
  }

  async getAdminReferrals(query: SearchBusinessReferralsDto) {
    return this.listReferrals(query, { forAdmin: true, includePrivate: true });
  }

  async getAdminReferralById(referralId: string) {
    const id = this.toObjectId(referralId, 'referral id');
    let query: any = this.businessReferralModel.findById(id);
    if (typeof query?.populate === 'function') {
      query = query
        .populate('serviceCategoryId', 'categoryName')
        .populate(
          'referredByUserId',
          'firstName lastName username email profilePicture role',
        )
        .populate(
          'claimedByUserId',
          'firstName lastName username email profilePicture businessProfile',
        );
    }
    const referral = await query;
    if (!referral) {
      throw new HttpException('Business referral not found', 404);
    }

    const base = this.mapReferral(referral, true);

    let claimedByUser: Record<string, any> | undefined;
    if (referral.claimedByUserId) {
      if (
        typeof referral.claimedByUserId === 'object' &&
        referral.claimedByUserId.email
      ) {
        const u = referral.claimedByUserId;
        claimedByUser = {
          id: String(u._id || u.id),
          name:
            [u.firstName, u.lastName].filter(Boolean).join(' ') ||
            u.username ||
            u.businessProfile?.businessName ||
            u.email,
          email: u.email,
          username: u.username,
          avatar: u.profilePicture,
          businessName: u.businessProfile?.businessName,
        };
      } else {
        const u = await this.userModel
          .findById(referral.claimedByUserId)
          .select(
            'firstName lastName username email profilePicture businessProfile',
          )
          .lean();
        if (u) {
          claimedByUser = {
            id: String(u._id || (u as any).id),
            name:
              [u.firstName, u.lastName].filter(Boolean).join(' ') ||
              u.username ||
              (u as any).businessProfile?.businessName ||
              u.email,
            email: u.email,
            username: u.username,
            avatar: u.profilePicture,
            businessName: (u as any).businessProfile?.businessName,
          };
        }
      }
    }

    let referredByUser: Record<string, any> | undefined;
    if (referral.referredByUserId) {
      if (
        typeof referral.referredByUserId === 'object' &&
        referral.referredByUserId.email
      ) {
        const u = referral.referredByUserId;
        referredByUser = {
          id: String(u._id || u.id),
          name:
            [u.firstName, u.lastName].filter(Boolean).join(' ') ||
            u.username ||
            u.email,
          email: u.email,
          username: u.username,
          avatar: u.profilePicture,
          role: u.role,
        };
      } else {
        const u = await this.userModel
          .findById(referral.referredByUserId)
          .select('firstName lastName username email profilePicture role')
          .lean();
        if (u) {
          referredByUser = {
            id: String(u._id || (u as any).id),
            name:
              [u.firstName, u.lastName].filter(Boolean).join(' ') ||
              u.username ||
              u.email,
            email: u.email,
            username: u.username,
            avatar: u.profilePicture,
            role: (u as any).role,
          };
        }
      }
    }

    return {
      ...base,
      claimedByUser,
      referredByUser: referredByUser ?? base.referredBy,
    };
  }

  async deleteReferralByAdmin(referralId: string) {
    const id = this.toObjectId(referralId, 'referral id');
    const referral = await this.businessReferralModel.findById(id);
    if (!referral) {
      throw new HttpException('Business referral not found', 404);
    }

    const imagesToDelete = [
      ...(referral.images ?? []),
      ...(referral.image ? [referral.image] : []),
    ];

    await Promise.allSettled(
      imagesToDelete
        .filter((img) => Boolean(img?.publicId))
        .map((img) => fileUpload.deleteResourceFromCloudinary(img.publicId)),
    );

    await Promise.all([
      this.businessClaimModel
        ? this.businessClaimModel.deleteMany({ referralId: id })
        : Promise.resolve(),
      this.reviewModel
        ? this.reviewModel.deleteMany({ sourceReferralId: id })
        : Promise.resolve(),
    ]);

    await this.businessReferralModel.findByIdAndDelete(id);

    return {
      id: referralId,
      businessName: referral.businessName,
      deleted: true,
    };
  }

  async findPublicReferralDiscoveryCards(
    query: SearchBusinessReferralsDto & { location?: string },
  ) {
    const filter = this.buildListFilter(query, {});
    const referrals = await this.businessReferralModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return referrals.map((referral) => this.mapReferral(referral));
  }

  async getMyReferrals(referrerId: string, query: MyBusinessReferralsQueryDto) {
    await this.getCreatorOrThrow(referrerId, 'customer');
    return this.listReferrals(query, {
      includePrivate: true,
      referredByUserId: this.toObjectId(referrerId, 'referrer id'),
    });
  }

  async updateUnclaimedReferralEmail(
    referralId: string,
    referrerId: string,
    dto: UpdateReferralEmailDto,
  ) {
    const referralObjectId = this.toObjectId(
      referralId,
      'business referral id',
    );
    const referrerObjectId = this.toObjectId(referrerId, 'referrer id');
    const businessEmail = dto.businessEmail.trim().toLowerCase();

    const referral = await this.businessReferralModel.findOne({
      _id: referralObjectId,
      $or: [
        { createdByUserId: referrerObjectId },
        // Supports customer referrals created before createdByUserId existed.
        { referredByUserId: referrerObjectId },
      ],
      listingStatus: 'published',
      claimStatus: 'unclaimed',
    });
    if (!referral) {
      throw new HttpException('Business referral not found', 404);
    }
    if (referral.businessEmail === businessEmail) {
      throw new HttpException(
        'The corrected email must be different from the current email',
        400,
      );
    }

    await this.ensureNoStrongDuplicate(
      {
        businessName: referral.businessName,
        businessEmail,
        businessPhone: referral.businessPhone,
        state: referral.state,
        city: referral.city,
      },
      referral._id,
    );

    const updatedReferral = await this.businessReferralModel.findOneAndUpdate(
      {
        _id: referral._id,
        $or: [
          { createdByUserId: referrerObjectId },
          { referredByUserId: referrerObjectId },
        ],
        listingStatus: 'published',
        claimStatus: 'unclaimed',
      },
      {
        $set: {
          businessEmail,
          emailDeliveryStatus: 'pending',
        },
        $unset: {
          emailDeliveryFailureReason: 1,
          emailProviderMessageId: 1,
        },
      },
      { new: true, runValidators: true },
    );
    if (!updatedReferral) {
      throw new HttpException(
        'This business referral can no longer be corrected',
        409,
      );
    }

    const notifiedReferral =
      await this.notificationService.sendClaimNotification(updatedReferral._id);

    return this.mapReferral(notifiedReferral ?? updatedReferral, true);
  }

  async getPublicReferralBySlug(slug: string) {
    const referral = await this.businessReferralModel.findOne({
      slug: slug.trim().toLowerCase(),
      listingStatus: 'published',
    });

    if (!referral) {
      throw new HttpException('Business referral not found', 404);
    }

    const publicReferral = this.mapReferral(referral);
    if (referral.claimStatus !== 'claimed' || !referral.claimedByUserId) {
      return publicReferral;
    }

    const businessOwner = await this.userModel.findById(
      referral.claimedByUserId,
    );
    if (!businessOwner || !hasProfileRole(businessOwner, 'businessOwner')) {
      return publicReferral;
    }

    const profile = getBusinessProfile(businessOwner);
    const canonicalProfileUrl =
      buildPublicProfileUrl(businessOwner.username) ??
      `/services/businesses/${businessOwner.id}`;

    return {
      ...publicReferral,
      canonicalProfileUrl,
      ownerManagedProfile: {
        id: businessOwner.id,
        username: businessOwner.username,
        profileUrl: canonicalProfileUrl,
        businessName: profile.businessName,
        ownerName: profile.ownerName,
        businessEmail: profile.businessEmail,
        businessPhone: profile.phoneNumber,
        profilePicture: profile.profilePicture,
        backgroundImage: profile.backgroundImage,
        category: profile.category,
        serviceCategoryId: profile.serviceCategoryId,
        serviceArea: profile.serviceArea,
        businessWebsiteUrl: profile.businessWebsiteUrl,
        bio: profile.bio,
        country: profile.country,
        state: profile.state,
        city: profile.city,
        address: profile.address,
        postcode: profile.postcode,
      },
    };
  }
}
