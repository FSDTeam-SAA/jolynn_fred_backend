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

type CreateUserFiles = {
  profilePicture?: Express.Multer.File;
  csvFile?: Express.Multer.File;
};

type ProfileUpdateFiles = {
  profilePicture?: Express.Multer.File;
  backgroundImage?: Express.Multer.File;
};

const userSearchAbleFields = [
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
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return user.businessName || fullName || user.username || user.email;
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
          'status',
          'tag',
          'createdAt',
          'updatedAt',
        ].join(' '),
      );

    if (!businessOwner) {
      throw new HttpException('Business owner not found', 404);
    }

    if (businessOwner.role !== 'businessOwner') {
      throw new HttpException('Business owner not found', 404);
    }

    if (businessOwner.status !== 'active') {
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
    const whereConditions = buildWhereConditions(params, userSearchAbleFields);

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

    return {
      ownerId: businessOwner.id,
      displayName: this.buildDisplayName(businessOwner),
      businessName: businessOwner.businessName,
      category: businessOwner.category,
      serviceCategoryId: businessOwner.serviceCategoryId,
      bio: businessOwner.bio,
      serviceArea: businessOwner.serviceArea,
      phoneNumber: businessOwner.phoneNumber,
      businessEmail: businessOwner.businessEmail,
      email: businessOwner.email,
      businessWebsiteUrl: businessOwner.businessWebsiteUrl,
      country: businessOwner.country,
      city: businessOwner.city,
      state: businessOwner.state,
      address: businessOwner.address,
      postcode: businessOwner.postcode,
      profilePicture: businessOwner.profilePicture,
      backgroundImage: businessOwner.backgroundImage,
      firstName: businessOwner.firstName,
      lastName: businessOwner.lastName,
      username: businessOwner.username,
      role: businessOwner.role,
      status: businessOwner.status,
      tag: businessOwner.tag,
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
    const shouldNotifyRejection =
      updateUserDto.status === 'rejected' && user.status !== 'rejected';
    delete updateUserDto.reason;

    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      updateUserDto,
      { new: true },
    );

    if (shouldNotifyRejection) {
      this.sendAdminActionEmail(
        user,
        'account rejection',
        rejectionReason,
      );
    }

    return updatedUser;
  }

  private sendAdminActionEmail(
    user: UserDocument,
    action: 'account deletion' | 'business profile deletion' | 'account rejection',
    reason?: string,
  ) {
    const isAccountDeletion = action === 'account deletion';
    const isRejection = action === 'account rejection';
    const details = [
      ...(user.businessName
        ? [{ label: 'Business Name', value: user.businessName }]
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
        greetingName: user.firstName || user.businessName || 'there',
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
    if (user.role !== 'businessOwner') {
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

    const updatedUser = await this.userModel.findByIdAndUpdate(
      businessOwnerId,
      {
        $set: { role: 'user', status: 'active' },
        $unset: {
          businessName: 1,
          businessEmail: 1,
          businessWebsiteUrl: 1,
          serviceArea: 1,
          category: 1,
          serviceCategoryId: 1,
          stripeAccountId: 1,
        },
      },
      { new: true, runValidators: true },
    );

    this.sendAdminActionEmail(user, 'business profile deletion', reason);

    return { user: updatedUser, businessProfileDeleted: true };
  }

  async getProfile(id: string) {
    const result = await this.userModel.findById(id);
    if (!result) {
      throw new HttpException('User not found', 404);
    }
    return result;
  }

  async updateMyProfile(
    id: string,
    updateUserDto: UpdateUserDto,
    files?: ProfileUpdateFiles,
  ) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    if (files?.profilePicture) {
      const uploadedFile = await fileUpload.uploadToCloudinary(
        files.profilePicture,
      );
      updateUserDto.profilePicture = uploadedFile.url;
    }
    if (files?.backgroundImage) {
      const uploadedFile = await fileUpload.uploadToCloudinary(
        files.backgroundImage,
      );
      updateUserDto.backgroundImage = uploadedFile.url;
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

    const result = await this.userModel.findByIdAndUpdate(id, updateUserDto, {
      new: true,
    });
    return result;
  }

  async getPublicBusinessProfileByUsername(
    username: string,
    serviceId?: string,
  ) {
    const normalizedUsername = this.normalizeAndValidateUsername(username);

    const businessOwner = await this.userModel.findOne({
      username: normalizedUsername,
      role: 'businessOwner',
      status: 'active',
    });

    if (!businessOwner) {
      throw new HttpException('Business profile not found', 404);
    }

    const businessOwnerId = this.toObjectId(
      businessOwner.id,
      'business owner id',
    );
    const viewedService = await this.recordViewedService(
      serviceId,
      businessOwnerId,
    );

    const [services, galleryItems, reviewSummary] = await Promise.all([
      this.serviceModel
        .find({ ownerId: businessOwnerId })
        .select('title description logo viewCount createdAt')
        .sort({ createdAt: -1 }),
      this.gallaryModel
        .find({ userId: businessOwnerId })
        .select('title images createdAt')
        .sort({ createdAt: -1 }),
      this.reviewModel.aggregate([
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
          },
        },
      ]),
    ]);

    const reviewMetrics = reviewSummary[0];
    const totalGalleryImages = galleryItems.reduce(
      (count, item) => count + item.images.length,
      0,
    );

    return {
      profile: {
        id: businessOwner.id,
        username: businessOwner.username,
        businessName: businessOwner.businessName,
        ownerName: [businessOwner.firstName, businessOwner.lastName]
          .filter(Boolean)
          .join(' '),
        profilePicture: businessOwner.profilePicture,
        backgroundImage: businessOwner.backgroundImage,
        bio: businessOwner.bio,
        category: businessOwner.category,
        serviceCategoryId: businessOwner.serviceCategoryId,
        serviceArea: businessOwner.serviceArea,
        businessWebsiteUrl: businessOwner.businessWebsiteUrl,
        businessEmail: businessOwner.businessEmail,
        phoneNumber: businessOwner.phoneNumber,
        country: businessOwner.country,
        city: businessOwner.city,
        state: businessOwner.state,
        address: businessOwner.address,
      },
      summary: {
        totalServices: services.length,
        totalGalleryImages,
        totalReviews: reviewMetrics?.totalReviews ?? 0,
        averageRating: reviewMetrics?.averageRating
          ? Number(reviewMetrics.averageRating.toFixed(1))
          : 0,
      },
      services,
      gallery: galleryItems,
      viewedService,
    };
  }
}
