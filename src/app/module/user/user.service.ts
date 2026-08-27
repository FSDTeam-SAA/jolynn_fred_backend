import { HttpException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Model, Types } from 'mongoose';
import { fileUpload } from 'src/app/helpers/fileUploder';
import { IFilterParams } from 'src/app/helpers/pick';
import paginationHelper, { IOptions } from 'src/app/helpers/pagenation';
import buildWhereConditions from 'src/app/helpers/buildWhereConditions';
import {
  BusinessService,
  BusinessServiceDocument,
} from '../service/entities/service.entity';
import {
  ServiceCategory,
  ServiceCategoryDocument,
} from '../service-category/entities/service-category.entity';
import { Review, ReviewDocument } from '../reviews/entities/review.entity';
import { Gallary, GallaryDocument } from '../gallary/entities/gallary.entity';
import {
  isReservedUsername,
  normalizeUsername,
  USERNAME_REGEX,
} from 'src/app/helpers/username';
import { Qoute, QouteDocument } from '../qoute/entities/qoute.entity';
import {
  SaveQuote,
  SaveQuoteDocument,
} from '../save-quote/entities/save-quote.entity';
import { Report, ReportDocument } from '../report/entities/report.entity';
import sendMailer from 'src/app/helpers/sendMailer';
import { createNotificationEmailTemplate } from 'src/app/helpers/template';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { type UserRole } from 'src/app/constants/auth.constants';
import {
  activeBusinessOwnerFilter,
  businessOwnerMembershipFilter,
  getAccountStatus,
  getAvailableRoles,
  getBusinessProfile,
  getDefaultRole,
  getPersonalProfile,
  hasProfileRole,
  toPlainProfile,
} from 'src/app/helpers/account-profile';
import {
  buildLegacyProfileUrl,
  buildPublicProfileUrl,
  buildPublicServiceProfileUrl,
  createServiceSlug,
} from 'src/app/helpers/profile-url';

type CreateUserFiles = {
  profilePicture?: Express.Multer.File;
  csvFile?: Express.Multer.File;
};

type ProfileUpdateFiles = {
  profilePicture?: Express.Multer.File;
  backgroundImage?: Express.Multer.File;
};

const userSearchAbleFields = [
  'userProfile.firstName',
  'userProfile.lastName',
  'userProfile.phoneNumber',
  'userProfile.country',
  'userProfile.city',
  'userProfile.state',
  'userProfile.address',
  'businessProfile.ownerName',
  'businessProfile.businessName',
  'businessProfile.category',
  'businessProfile.city',
  'businessProfile.state',
  'firstName',
  'lastName',
  'email',
  'username',
  'role',
  'gender',
  'phoneNumber',
  'businessName',
  'category',
  'country',
  'city',
  'state',
  'address',
  'postcode',
  'status',
];

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(BusinessService.name)
    private readonly serviceModel: Model<BusinessServiceDocument>,
    @InjectModel(ServiceCategory.name)
    private readonly serviceCategoryModel: Model<ServiceCategoryDocument>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Gallary.name)
    private readonly gallaryModel: Model<GallaryDocument>,
    @InjectModel(Qoute.name)
    private readonly qouteModel: Model<QouteDocument>,
    @InjectModel(SaveQuote.name)
    private readonly saveQuoteModel: Model<SaveQuoteDocument>,
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
  ) {}

  private toObjectId(id: string, label = 'user id') {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, 400);
    }

    return new Types.ObjectId(id);
  }

  private normalizeAndValidateUsername(username?: string) {
    const normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername) {
      return normalizedUsername;
    }

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      throw new HttpException(
        'Username must be 3-30 characters and can contain lowercase letters, numbers, underscores, or hyphens',
        400,
      );
    }

    if (isReservedUsername(normalizedUsername)) {
      throw new HttpException('This username is not available', 400);
    }

    return normalizedUsername;
  }

  private buildDisplayName(user: UserDocument) {
    const businessProfile = getBusinessProfile(user);
    const personalProfile = getPersonalProfile(user);
    const fullName = [personalProfile.firstName, personalProfile.lastName]
      .filter(Boolean)
      .join(' ');
    return (
      businessProfile.businessName ||
      businessProfile.ownerName ||
      fullName ||
      user.username ||
      'Business'
    );
  }

  private async getBusinessReviewSummary(businessOwnerId: Types.ObjectId) {
    const summary = await this.reviewModel.aggregate([
      {
        $match: {
          businessId: businessOwnerId,
        },
      },
      {
        $group: {
          _id: '$businessId',
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          fiveStar: {
            $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] },
          },
          fourStar: {
            $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] },
          },
          threeStar: {
            $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] },
          },
          twoStar: {
            $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] },
          },
          oneStar: {
            $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] },
          },
        },
      },
    ]);

    const item = summary[0];

    return {
      averageRating: item ? Number(item.averageRating.toFixed(1)) : 0,
      totalReviews: item?.totalReviews ?? 0,
      ratingBreakdown: {
        5: item?.fiveStar ?? 0,
        4: item?.fourStar ?? 0,
        3: item?.threeStar ?? 0,
        2: item?.twoStar ?? 0,
        1: item?.oneStar ?? 0,
      },
    };
  }

  private async recordViewedService(
    serviceId: string | undefined,
    ownerId: Types.ObjectId,
  ) {
    if (!serviceId) {
      return null;
    }

    const service = await this.serviceModel
      .findOneAndUpdate(
        {
          _id: this.toObjectId(serviceId, 'service id'),
          ownerId,
        },
        { $inc: { viewCount: 1 } },
        { new: true },
      )
      .select('_id serviceCategoryId viewCount')
      .lean();

    if (!service) {
      throw new HttpException('Service not found for this business owner', 404);
    }

    let categoryViewCount: number | undefined;

    if (service.serviceCategoryId) {
      const category = await this.serviceCategoryModel
        .findOneAndUpdate(
          {
            _id: service.serviceCategoryId,
            status: 'approved',
            isActive: true,
          },
          { $inc: { viewCount: 1 } },
          { new: true },
        )
        .select('_id viewCount')
        .lean();

      categoryViewCount = category?.viewCount;
    }

    return {
      _id: service._id,
      viewCount: service.viewCount ?? 0,
      categoryViewCount,
    };
  }

  private resolveServiceIdBySlug(
    services: BusinessServiceDocument[],
    serviceSlug?: string,
  ) {
    if (!serviceSlug) return undefined;

    const normalizedSlug = createServiceSlug(serviceSlug);
    if (!normalizedSlug) {
      throw new HttpException('Invalid service slug', 400);
    }

    const matches = services.filter(
      (service) => createServiceSlug(service.title) === normalizedSlug,
    );

    if (matches.length === 0) {
      throw new HttpException('Service not found for this business owner', 404);
    }
    if (matches.length > 1) {
      throw new HttpException(
        'Service slug is not unique for this business owner',
        409,
      );
    }

    return matches[0].id;
  }

  private async getPublicBusinessOwnerOrThrow(ownerId: string) {
    const businessOwnerId = this.toObjectId(ownerId, 'business owner id');
    const businessOwner = await this.userModel
      .findById(businessOwnerId)
      .select(
        [
          'firstName',
          'lastName',
          'email',
          'username',
          'phoneNumber',
          'businessName',
          'businessEmail',
          'businessWebsiteUrl',
          'serviceArea',
          'category',
          'serviceCategoryId',
          'country',
          'city',
          'state',
          'address',
          'postcode',
          'profilePicture',
          'backgroundImage',
          'bio',
          'role',
          'roles',
          'status',
          'businessProfile',
          'tag',
          'createdAt',
          'updatedAt',
        ].join(' '),
      );

    if (!businessOwner) {
      throw new HttpException('Business owner not found', 404);
    }

    if (!hasProfileRole(businessOwner, 'businessOwner')) {
      throw new HttpException('Business owner not found', 404);
    }

    if (getBusinessProfile(businessOwner).status !== 'active') {
      throw new HttpException('Business owner is not active', 404);
    }

    return businessOwner;
  }

  private async ensureUniqueUserFields(
    payload: Partial<CreateUserDto | UpdateUserDto>,
    currentUserId?: string,
  ) {
    if (payload.email) {
      const existingUser = await this.userModel.findOne({
        email: payload.email.toLowerCase(),
        ...(currentUserId ? { _id: { $ne: currentUserId } } : {}),
      });

      if (existingUser) {
        throw new HttpException('User already exists with this email', 400);
      }
    }

    if (payload.username) {
      const existingUser = await this.userModel.findOne({
        username: this.normalizeAndValidateUsername(payload.username),
        ...(currentUserId ? { _id: { $ne: currentUserId } } : {}),
      });

      if (existingUser) {
        throw new HttpException('Username is already taken', 400);
      }
    }
  }

  private getEmailsFromCsv(file: Express.Multer.File): string[] {
    if (!file?.buffer?.length) {
      throw new HttpException('No valid CSV file provided', 400);
    }

    const isCsv =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname?.toLowerCase().endsWith('.csv');

    if (!isCsv) {
      throw new HttpException('Only CSV files are allowed', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const lines = file.buffer
      .toString('utf8')
      .split(/\r?\n/)
      .map((value) => value.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);

    if (!lines.length || lines[0].toLowerCase() !== 'email') {
      throw new HttpException('CSV first row must be email', 400);
    }

    const emails = lines.slice(1).map((email) => email.toLowerCase());

    if (!emails.length) {
      throw new HttpException('CSV must contain at least one email', 400);
    }

    const invalidEmail = emails.find((email) => !emailRegex.test(email));
    if (invalidEmail) {
      throw new HttpException(`Invalid email in CSV: ${invalidEmail}`, 400);
    }

    return [...new Set(emails)];
  }

  async createUser(
    createUserDto: CreateUserDto,
    files?: CreateUserFiles | Express.Multer.File,
  ) {
    const payload = Object.fromEntries(
      Object.entries(createUserDto).filter(
        ([, value]) => value !== undefined && value !== '',
      ),
    ) as CreateUserDto & { fullName?: string };

    const profilePicture =
      files && 'buffer' in files ? files : files?.profilePicture;
    const csvFile = files && 'buffer' in files ? undefined : files?.csvFile;

    if (csvFile) {
      const emails = this.getEmailsFromCsv(csvFile);
      const existingUsers = await this.userModel
        .find({ email: { $in: emails } })
        .select('email');
      const existingEmails = new Set(
        existingUsers.map((user) => user.email.toLowerCase()),
      );
      const users = emails
        .filter((email) => !existingEmails.has(email))
        .map((email) => ({
          ...payload,
          email,
        }));

      if (!users.length) {
        throw new HttpException('All CSV users already exist', 400);
      }

      return this.userModel.insertMany(users);
    }

    if (!payload.email) {
      throw new HttpException('Email is required', 400);
    }

    if (payload.email) {
      payload.email = payload.email.toLowerCase();
    }
    if (payload.username) {
      payload.username = this.normalizeAndValidateUsername(payload.username);
    }

    await this.ensureUniqueUserFields(payload);

    if (profilePicture) {
      const uploadedFile = await fileUpload.uploadToCloudinary(profilePicture);
      payload.profilePicture = uploadedFile.url;
    }

    const createdUser = await this.userModel.create(payload);
    return createdUser;
  }

  async getAllUser(params: IFilterParams, options: IOptions) {
    const { limit, page, skip, sortBy, sortOrder } = paginationHelper(options);
    const { role, status, ...otherParams } = params;
    const baseConditions = buildWhereConditions(
      otherParams,
      userSearchAbleFields,
    );
    const andConditions: Record<string, unknown>[] = [baseConditions];
    if (role) {
      andConditions.push({
        $or: [{ roles: role }, { role }],
      });
    }
    if (status) {
      andConditions.push({
        $or: [
          { accountStatus: status },
          { 'businessProfile.status': status },
          { accountStatus: { $exists: false }, status },
        ],
      });
    }
    const whereConditions = { $and: andConditions };

    const total = await this.userModel.countDocuments(whereConditions);
    const users = await this.userModel
      .find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder } as any);

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: users,
    };
  }

  async getSingleUser(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    return user;
  }

  async getPublicBusinessOverview(ownerId: string, serviceId?: string) {
    const businessOwner = await this.getPublicBusinessOwnerOrThrow(ownerId);
    const businessOwnerId = this.toObjectId(ownerId, 'business owner id');
    const viewedService = await this.recordViewedService(
      serviceId,
      businessOwnerId,
    );
    const reviewSummary = await this.getBusinessReviewSummary(businessOwnerId);
    const profile = getBusinessProfile(businessOwner);

    return {
      ownerId: businessOwner.id,
      displayName: this.buildDisplayName(businessOwner),
      businessName: profile.businessName,
      category: profile.category,
      serviceCategoryId: profile.serviceCategoryId,
      bio: profile.bio,
      serviceArea: profile.serviceArea,
      phoneNumber: profile.phoneNumber,
      businessEmail: profile.businessEmail,
      email: profile.businessEmail,
      businessWebsiteUrl: profile.businessWebsiteUrl,
      country: profile.country,
      city: profile.city,
      state: profile.state,
      address: profile.address,
      postcode: profile.postcode,
      profilePicture: profile.profilePicture,
      backgroundImage: profile.backgroundImage,
      ownerName: profile.ownerName,
      username: businessOwner.username,
      role: 'businessOwner',
      status: profile.status,
      rating: reviewSummary.averageRating,
      totalReviews: reviewSummary.totalReviews,
      reviewSummary,
      viewedService,
      createdAt: businessOwner.get('createdAt'),
      updatedAt: businessOwner.get('updatedAt'),
    };
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    if (file) {
      const uploadedFile = await fileUpload.uploadToCloudinary(file);
      updateUserDto.profilePicture = uploadedFile.url;
    }
    if (updateUserDto.email) {
      updateUserDto.email = updateUserDto.email.toLowerCase();
    }
    if (updateUserDto.username) {
      updateUserDto.username = this.normalizeAndValidateUsername(
        updateUserDto.username,
      );
    }

    await this.ensureUniqueUserFields(updateUserDto, id);

    const rejectionReason = updateUserDto.reason;
    const businessProfile = getBusinessProfile(user);
    const isBusinessProfileUpdate = hasProfileRole(user, 'businessOwner');
    const shouldNotifyRejection =
      updateUserDto.status === 'rejected' &&
      (isBusinessProfileUpdate
        ? businessProfile.status !== 'rejected'
        : getAccountStatus(user) !== 'rejected');
    const shouldNotifyBusinessApproval =
      isBusinessProfileUpdate &&
      businessProfile.status === 'pending' &&
      updateUserDto.status === 'active';
    delete updateUserDto.reason;
    const updatePayload: Record<string, unknown> = { ...updateUserDto };
    if (isBusinessProfileUpdate) {
      const businessFields = [
        'businessName',
        'businessEmail',
        'businessWebsiteUrl',
        'serviceArea',
        'category',
        'phoneNumber',
        'country',
        'city',
        'state',
        'address',
        'postcode',
        'profilePicture',
        'backgroundImage',
        'bio',
        'stripeAccountId',
      ];
      for (const field of businessFields) {
        if (updatePayload[field] !== undefined) {
          updatePayload[`businessProfile.${field}`] = updatePayload[field];
          delete updatePayload[field];
        }
      }
    }
    if (updateUserDto.status) {
      if (isBusinessProfileUpdate) {
        updatePayload['businessProfile.status'] = updateUserDto.status;
      } else {
        updatePayload.accountStatus = updateUserDto.status;
      }
      delete updatePayload.status;
    }
    if (isBusinessProfileUpdate && !user.businessProfile) {
      const migratedBusinessProfile = {
        ...businessProfile,
      } as Record<string, unknown>;
      for (const [field, value] of Object.entries(updatePayload)) {
        if (field.startsWith('businessProfile.')) {
          migratedBusinessProfile[field.slice('businessProfile.'.length)] =
            value;
          delete updatePayload[field];
        }
      }
      updatePayload.businessProfile = migratedBusinessProfile;
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true },
    );

    if (shouldNotifyRejection) {
      this.sendAdminActionEmail(user, 'account rejection', rejectionReason);
    }

    if (shouldNotifyBusinessApproval) {
      void sendMailer(
        user.email,
        'Your business has been approved!',
        createNotificationEmailTemplate({
          heading: 'Your business has been approved!',
          subheading: 'Your business profile is now live on Jolynn.',
          greetingName:
            businessProfile.ownerName ||
            businessProfile.businessName ||
            'there',
          introText:
            'Your business profile has been approved and is now visible on the platform.',
          details: [
            ...(businessProfile.businessName
              ? [
                  {
                    label: 'Business Name',
                    value: businessProfile.businessName,
                  },
                ]
              : []),
          ],
          noteTitle: 'What happens next?',
          noteText:
            'You can now manage your business profile, services, gallery, and customer requests from your account.',
        }),
      ).catch((error) => {
        console.error('Failed to send business approval email:', error);
      });
    }

    return updatedUser;
  }

  private sendAdminActionEmail(
    user: UserDocument,
    action:
      | 'account deletion'
      | 'business profile deletion'
      | 'account rejection',
    reason?: string,
  ) {
    const isAccountDeletion = action === 'account deletion';
    const isRejection = action === 'account rejection';
    const personalProfile = getPersonalProfile(user);
    const businessProfile = getBusinessProfile(user);
    const details = [
      ...(businessProfile.businessName
        ? [{ label: 'Business Name', value: businessProfile.businessName }]
        : []),
      ...(reason ? [{ label: 'Reason', value: reason }] : []),
    ];

    void sendMailer(
      user.email,
      isRejection
        ? 'Your account application was rejected'
        : isAccountDeletion
          ? 'Your account has been deleted'
          : 'Your business profile has been deleted',
      createNotificationEmailTemplate({
        heading: isRejection
          ? 'Account Application Rejected'
          : isAccountDeletion
            ? 'Account Deleted'
            : 'Business Profile Deleted',
        subheading: isRejection
          ? 'Your account application was not approved by the Jolynn team.'
          : isAccountDeletion
            ? 'Your account is no longer available on Jolynn.'
            : 'Your business profile is no longer active on Jolynn.',
        greetingName:
          personalProfile.firstName ||
          businessProfile.ownerName ||
          businessProfile.businessName ||
          'there',
        introText: isRejection
          ? 'Your account application was rejected by an administrator or the support team.'
          : isAccountDeletion
            ? 'Your account was deleted by an administrator or the support team.'
            : 'Your business profile and its related business data were deleted by an administrator or the support team. Your personal user account remains active.',
        details,
        noteTitle: 'Need help?',
        noteText:
          'Please contact our support team if you believe this action was taken in error.',
      }),
    ).catch((error) => {
      console.error(`Failed to send ${action} email:`, error);
    });
  }

  async deleteUser(id: string, reason?: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    if (!hasProfileRole(user, 'businessOwner')) {
      const result = await this.userModel.findByIdAndDelete(id);
      this.sendAdminActionEmail(user, 'account deletion', reason);
      return { user: result, businessProfileDeleted: false };
    }

    const businessOwnerId = this.toObjectId(id, 'business owner id');
    const [services, galleries] = await Promise.all([
      this.serviceModel.find({ ownerId: businessOwnerId }).select('logo'),
      this.gallaryModel.find({ userId: businessOwnerId }).select('images'),
    ]);

    const cloudinaryPublicIds = [
      ...services.map((service) => service.logo?.publicId),
      ...galleries.flatMap((gallery) =>
        gallery.images.map((image) => image.publicId),
      ),
    ].filter((publicId): publicId is string => Boolean(publicId));

    await Promise.all(
      cloudinaryPublicIds.map((publicId) =>
        fileUpload.deleteFromCloudinary(publicId),
      ),
    );

    await Promise.all([
      this.serviceModel.deleteMany({ ownerId: businessOwnerId }),
      this.gallaryModel.deleteMany({ userId: businessOwnerId }),
      this.reviewModel.deleteMany({ businessId: businessOwnerId }),
      this.qouteModel.deleteMany({ businessOwnerId: businessOwnerId }),
      this.saveQuoteModel.deleteMany({ businessOwnerId: businessOwnerId }),
      this.reportModel.deleteMany({ ownerId: businessOwnerId }),
    ]);

    const remainingRoles = getAvailableRoles(user).filter(
      (role) => role !== 'businessOwner',
    );
    const updatedUser = remainingRoles.length
      ? await this.userModel.findByIdAndUpdate(
          businessOwnerId,
          {
            $set: {
              roles: remainingRoles,
              role:
                user.role === 'businessOwner' ? remainingRoles[0] : user.role,
              defaultRole:
                getDefaultRole(user) === 'businessOwner'
                  ? remainingRoles[0]
                  : getDefaultRole(user),
            },
            $unset: {
              businessProfile: 1,
              businessName: 1,
              businessEmail: 1,
              businessWebsiteUrl: 1,
              serviceArea: 1,
              category: 1,
              requestedCategory: 1,
              serviceCategoryId: 1,
              stripeAccountId: 1,
            },
          },
          { new: true, runValidators: true },
        )
      : await this.userModel.findByIdAndDelete(businessOwnerId);

    this.sendAdminActionEmail(
      user,
      remainingRoles.length ? 'business profile deletion' : 'account deletion',
      reason,
    );

    return {
      user: updatedUser,
      businessProfileDeleted: remainingRoles.length > 0,
    };
  }

  async getProfile(id: string, activeRole: UserRole) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }

    if (activeRole !== 'admin' && !hasProfileRole(user, activeRole)) {
      throw new HttpException('Profile not found', 404);
    }

    const profile =
      activeRole === 'businessOwner'
        ? toPlainProfile(getBusinessProfile(user))
        : toPlainProfile(getPersonalProfile(user));

    return {
      ...profile,
      id: user.id,
      email: user.email,
      username: user.username,
      emailVerified: user.emailVerified,
      role: activeRole,
      roles: getAvailableRoles(user),
      defaultRole: getDefaultRole(user),
      accountStatus: getAccountStatus(user),
      profile,
    };
  }

  async updateMyProfile(
    id: string,
    activeRole: UserRole,
    updateProfileDto: UpdateProfileDto,
    files?: ProfileUpdateFiles,
  ) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    if (activeRole !== 'admin' && !hasProfileRole(user, activeRole)) {
      throw new HttpException('Profile not found', 404);
    }

    const uploadedFields: Record<string, unknown> = {};
    if (files?.profilePicture) {
      const uploadedFile = await fileUpload.uploadToCloudinary(
        files.profilePicture,
      );
      uploadedFields.profilePicture = uploadedFile.url;
    }
    if (files?.backgroundImage) {
      const uploadedFile = await fileUpload.uploadToCloudinary(
        files.backgroundImage,
      );
      uploadedFields.backgroundImage = uploadedFile.url;
    }

    const incomingFields = {
      ...updateProfileDto,
      ...uploadedFields,
    } as Record<string, unknown>;
    delete incomingFields.profilePicture;
    delete incomingFields.backgroundImage;

    const personalFields = new Set([
      'firstName',
      'lastName',
      'gender',
      'phoneNumber',
      'country',
      'city',
      'state',
      'address',
      'postcode',
      'bio',
      'dateOfBirth',
      'tag',
    ]);
    const businessFields = new Set([
      'businessName',
      'ownerName',
      'businessEmail',
      'businessWebsiteUrl',
      'serviceArea',
      'phoneNumber',
      'country',
      'city',
      'state',
      'address',
      'postcode',
      'bio',
    ]);
    const targetProfile =
      activeRole === 'businessOwner' ? 'businessProfile' : 'userProfile';
    const allowedFields =
      activeRole === 'businessOwner' ? businessFields : personalFields;
    const setPayload: Record<string, unknown> = {};

    for (const [field, value] of Object.entries(incomingFields)) {
      if (allowedFields.has(field) && value !== undefined) {
        setPayload[`${targetProfile}.${field}`] =
          field === 'businessEmail' && typeof value === 'string'
            ? value.toLowerCase()
            : value;
      }
    }

    for (const [field, value] of Object.entries(uploadedFields)) {
      setPayload[`${targetProfile}.${field}`] = value;
    }

    if (!Object.keys(setPayload).length) {
      return this.getProfile(id, activeRole);
    }

    const hasStoredProfile =
      activeRole === 'businessOwner'
        ? Boolean(user.businessProfile)
        : Boolean(user.userProfile);
    if (!hasStoredProfile) {
      const migratedProfile = {
        ...(activeRole === 'businessOwner'
          ? getBusinessProfile(user)
          : getPersonalProfile(user)),
      } as Record<string, unknown>;
      for (const [path, value] of Object.entries(setPayload)) {
        migratedProfile[path.slice(targetProfile.length + 1)] = value;
      }
      for (const [field, value] of Object.entries(uploadedFields)) {
        migratedProfile[field] = value;
      }
      const migratedUser = await this.userModel.findByIdAndUpdate(
        id,
        { $set: { [targetProfile]: migratedProfile } },
        { new: true, runValidators: true },
      );
      if (!migratedUser) {
        throw new HttpException('User not found', 404);
      }
      return this.getProfile(id, activeRole);
    }

    const result = await this.userModel.findByIdAndUpdate(
      id,
      { $set: setPayload },
      { new: true, runValidators: true },
    );
    if (!result) {
      throw new HttpException('User not found', 404);
    }

    return this.getProfile(id, activeRole);
  }

  async getPublicBusinessProfileByUsername(
    username: string,
    serviceId?: string,
    serviceSlug?: string,
  ) {
    const normalizedUsername = this.normalizeAndValidateUsername(username);

    const businessOwner = await this.userModel.findOne({
      $and: [{ username: normalizedUsername }, activeBusinessOwnerFilter],
    });

    if (!businessOwner) {
      throw new HttpException('Business profile not found', 404);
    }

    const businessOwnerId = this.toObjectId(
      businessOwner.id,
      'business owner id',
    );
    const [services, galleryItems, reviewSummary] = await Promise.all([
      this.serviceModel
        .find({ ownerId: businessOwnerId, status: 'active' })
        .sort({ createdAt: -1 }),
      this.gallaryModel
        .find({ userId: businessOwnerId })
        .sort({ createdAt: -1 }),
      this.getBusinessReviewSummary(businessOwnerId),
    ]);

    const resolvedServiceId =
      serviceId || this.resolveServiceIdBySlug(services, serviceSlug);
    const viewedService = await this.recordViewedService(
      resolvedServiceId,
      businessOwnerId,
    );
    const viewedServiceTitle = resolvedServiceId
      ? services.find((service) => service.id === resolvedServiceId)?.title
      : undefined;

    const profile = getBusinessProfile(businessOwner);
    const totalGalleryImages = galleryItems.reduce(
      (count, item) => count + item.images.length,
      0,
    );
    const profileUrl = serviceSlug
      ? buildPublicServiceProfileUrl(
          businessOwner.username,
          viewedServiceTitle,
        )!
      : buildPublicProfileUrl(businessOwner.username)!;
    const legacyProfileUrl = buildLegacyProfileUrl(
      businessOwner.id,
      resolvedServiceId,
    );

    return {
      profileUrl,
      legacyProfileUrl,
      profile: {
        id: businessOwner.id,
        ownerId: businessOwner.id,
        username: businessOwner.username,
        displayName: this.buildDisplayName(businessOwner),
        profileUrl,
        businessName: profile.businessName,
        ownerName: profile.ownerName,
        profilePicture: profile.profilePicture,
        backgroundImage: profile.backgroundImage,
        bio: profile.bio,
        category: profile.category,
        requestedCategory: profile.requestedCategory,
        serviceCategoryId: profile.serviceCategoryId,
        serviceArea: profile.serviceArea,
        businessWebsiteUrl: profile.businessWebsiteUrl,
        businessEmail: profile.businessEmail,
        email: profile.businessEmail,
        phoneNumber: profile.phoneNumber,
        country: profile.country,
        city: profile.city,
        state: profile.state,
        address: profile.address,
        postcode: profile.postcode,
        role: 'businessOwner',
        status: profile.status,
        createdAt: businessOwner.get('createdAt'),
        updatedAt: businessOwner.get('updatedAt'),
      },
      summary: {
        totalServices: services.length,
        totalGalleryImages,
        ...reviewSummary,
      },
      services,
      gallery: galleryItems,
      viewedService,
    };
  }
}
