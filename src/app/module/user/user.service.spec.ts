jest.mock('../service/entities/service.entity', () => ({
  BusinessService: class BusinessService {},
}));
jest.mock('../service-category/entities/service-category.entity', () => ({
  ServiceCategory: class ServiceCategory {},
}));
jest.mock('../reviews/entities/review.entity', () => ({
  Review: class Review {},
}));
jest.mock('../gallary/entities/gallary.entity', () => ({
  Gallary: class Gallary {},
}));
jest.mock('../qoute/entities/qoute.entity', () => ({
  Qoute: class Qoute {},
}));
jest.mock('../save-quote/entities/save-quote.entity', () => ({
  SaveQuote: class SaveQuote {},
}));
jest.mock('../report/entities/report.entity', () => ({
  Report: class Report {},
}));
jest.mock('../business-referral/entities/business-referral.entity', () => ({
  BusinessReferral: class BusinessReferral {},
}));
jest.mock('../business-referral/entities/business-claim.entity', () => ({
  BusinessClaim: class BusinessClaim {},
}));

import { Types } from 'mongoose';
import { fileUpload } from 'src/app/helpers/fileUploder';
import { UserService } from './user.service';

const createQuery = <T>(value: T) => {
  const query: Record<string, any> = {};
  const promise = Promise.resolve(value);

  query.sort = jest.fn(() => query);
  query.select = jest.fn(() => query);
  query.populate = jest.fn(() => query);
  query.then = promise.then.bind(promise);
  query.catch = promise.catch.bind(promise);

  return query;
};

describe('UserService profile isolation', () => {
  const account = {
    id: 'account-id',
    email: 'member@example.com',
    username: 'member',
    emailVerified: true,
    role: 'user',
    roles: ['user', 'businessOwner'],
    defaultRole: 'user',
    accountStatus: 'active',
    status: 'active',
    userProfile: {
      firstName: 'Personal',
      profilePicture: 'personal.jpg',
    },
    businessProfile: {
      businessName: 'Business',
      profilePicture: 'business.jpg',
      status: 'active',
    },
  };

  function createService() {
    const userModel = {
      findById: jest.fn().mockResolvedValue(account),
      findByIdAndUpdate: jest.fn().mockResolvedValue(account),
    };
    const service = new UserService(
      userModel as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { service, userModel };
  }

  it('replaces business profile fields while preserving internal state', async () => {
    const { service, userModel } = createService();

    await service.updateMyProfile('account-id', 'businessOwner', {
      businessName: 'Updated Business',
      firstName: 'Not Allowed',
    } as any);

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'account-id',
      {
        $set: {
          businessProfile: {
            businessName: 'Updated Business',
            status: 'active',
          },
        },
      },
      { new: true, runValidators: true },
    );
  });

  it('replaces the user profile with only the submitted personal fields', async () => {
    const { service, userModel } = createService();

    await service.updateMyProfile('account-id', 'user', {
      firstName: 'Updated Personal',
      businessName: 'Not Allowed',
    } as any);

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'account-id',
      {
        $set: {
          userProfile: {
            firstName: 'Updated Personal',
          },
        },
      },
      { new: true, runValidators: true },
    );
  });
});

describe('UserService profile deletion', () => {
  const accountId = new Types.ObjectId();
  const serviceId = new Types.ObjectId();
  const quoteId = new Types.ObjectId();
  const conversationId = new Types.ObjectId();
  const helpWantedId = new Types.ObjectId();

  function createDeletionService() {
    const account = {
      _id: accountId,
      id: accountId.toString(),
      email: 'member@example.com',
      role: 'user',
      roles: ['user', 'businessOwner'],
      defaultRole: 'user',
      userProfile: {
        firstName: 'Personal',
        profilePicture:
          'https://res.cloudinary.com/demo/image/upload/v1/healthcare_app/personal.jpg',
      },
      businessProfile: {
        businessName: 'Business',
        profilePicture:
          'https://res.cloudinary.com/demo/image/upload/v1/healthcare_app/business.jpg',
      },
    };
    const userModel = {
      findById: jest.fn().mockResolvedValue(account),
      findByIdAndUpdate: jest.fn().mockResolvedValue(account),
      findByIdAndDelete: jest.fn().mockResolvedValue(account),
    };
    const serviceModel = {
      find: jest
        .fn()
        .mockReturnValue(
          createQuery([
            { _id: serviceId, logo: { publicId: 'services/logo' } },
          ]),
        ),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    const serviceCategoryModel = {
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const reviewModel = {
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const galleryModel = {
      find: jest
        .fn()
        .mockReturnValue(
          createQuery([{ images: [{ publicId: 'gallery/image' }] }]),
        ),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    const quoteModel = {
      find: jest.fn().mockReturnValue(createQuery([{ _id: quoteId }])),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    const saveQuoteModel = {
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    const reportModel = {
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    const quoteReplyModel = {
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    const conversationModel = {
      find: jest.fn().mockReturnValue(createQuery([{ _id: conversationId }])),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    const messageModel = {
      find: jest.fn().mockReturnValue(createQuery([{ attachments: [] }])),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    const helpWantedModel = {
      find: jest
        .fn()
        .mockReturnValue(createQuery([{ _id: helpWantedId, images: [] }])),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    const jobReportModel = {
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    const subCategoryModel = {
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    const contactModel = {
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const businessReferralModel = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockReturnValue(createQuery([])),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const businessClaimModel = {
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    const userService = new UserService(
      userModel as any,
      serviceModel as any,
      serviceCategoryModel as any,
      reviewModel as any,
      galleryModel as any,
      quoteModel as any,
      saveQuoteModel as any,
      reportModel as any,
      quoteReplyModel as any,
      conversationModel as any,
      messageModel as any,
      helpWantedModel as any,
      jobReportModel as any,
      subCategoryModel as any,
      contactModel as any,
      businessReferralModel as any,
      businessClaimModel as any,
    );

    return {
      account,
      userService,
      userModel,
      serviceModel,
      reviewModel,
      galleryModel,
      quoteModel,
      saveQuoteModel,
      reportModel,
      quoteReplyModel,
      conversationModel,
      messageModel,
      helpWantedModel,
      jobReportModel,
      subCategoryModel,
      contactModel,
      businessReferralModel,
      businessClaimModel,
    };
  }

  beforeEach(() => {
    jest
      .spyOn(fileUpload, 'deleteResourceFromCloudinary')
      .mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('deletes only personal-profile relations when a business profile remains', async () => {
    const models = createDeletionService();

    const result = await models.userService.deleteOwnProfile(
      accountId.toString(),
      'user',
    );

    expect(result).toMatchObject({
      deletedProfile: 'user',
      accountDeleted: false,
    });
    expect(models.reviewModel.deleteMany).toHaveBeenCalledWith({
      reviewerId: accountId,
      sourceReferralId: { $exists: false },
    });
    expect(models.reviewModel.updateMany).toHaveBeenCalledWith(
      { reviewerId: accountId, sourceReferralId: { $exists: true } },
      {
        $set: { reviewerName: 'Community member' },
        $unset: { reviewerId: 1, reviewerAvatar: 1 },
      },
    );
    expect(models.businessReferralModel.updateMany).toHaveBeenCalledWith(
      { referredByUserId: accountId },
      {
        $set: { referrerName: 'Community member' },
        $unset: { referredByUserId: 1, referrerAvatar: 1 },
      },
    );
    expect(models.quoteModel.deleteMany).toHaveBeenCalledWith({
      userId: accountId,
    });
    expect(models.quoteReplyModel.deleteMany).toHaveBeenCalledWith({
      qouteId: { $in: [quoteId] },
    });
    expect(models.conversationModel.deleteMany).toHaveBeenCalledWith({
      userId: accountId,
    });
    expect(models.helpWantedModel.deleteMany).toHaveBeenCalledWith({
      userId: accountId,
    });
    expect(models.serviceModel.deleteMany).not.toHaveBeenCalled();
    expect(models.galleryModel.deleteMany).not.toHaveBeenCalled();
    expect(models.userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      accountId,
      expect.objectContaining({
        $set: expect.objectContaining({ roles: ['businessOwner'] }),
        $unset: expect.objectContaining({ userProfile: 1 }),
      }),
      { new: true, runValidators: true },
    );
  });

  it('deletes business children and keeps the personal profile', async () => {
    const models = createDeletionService();
    const referralId = new Types.ObjectId();
    models.businessReferralModel.find.mockReturnValue(
      createQuery([
        {
          _id: referralId,
          image: { publicId: 'business-referrals/referral-image' },
        },
      ]),
    );

    const result = await models.userService.deleteOwnProfile(
      accountId.toString(),
      'businessOwner',
    );

    expect(result).toMatchObject({
      deletedProfile: 'businessOwner',
      accountDeleted: false,
    });
    expect(models.subCategoryModel.deleteMany).toHaveBeenCalledWith({
      serviceId: { $in: [serviceId] },
    });
    expect(models.serviceModel.deleteMany).toHaveBeenCalledWith({
      ownerId: accountId,
    });
    expect(models.reviewModel.deleteMany).toHaveBeenCalledWith({
      businessId: accountId,
    });
    expect(models.businessClaimModel.deleteMany).toHaveBeenCalledWith({
      referralId: { $in: [referralId] },
    });
    expect(models.businessReferralModel.deleteMany).toHaveBeenCalledWith({
      _id: { $in: [referralId] },
    });
    expect(models.quoteModel.deleteMany).toHaveBeenCalledWith({
      businessOwnerId: accountId,
    });
    expect(models.conversationModel.deleteMany).toHaveBeenCalledWith({
      businessOwnerId: accountId,
    });
    expect(models.userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      accountId,
      expect.objectContaining({
        $set: expect.objectContaining({ roles: ['user'] }),
        $unset: expect.objectContaining({ businessProfile: 1 }),
      }),
      { new: true, runValidators: true },
    );
    expect(fileUpload.deleteResourceFromCloudinary).toHaveBeenCalledWith(
      'services/logo',
      undefined,
    );
    expect(fileUpload.deleteResourceFromCloudinary).toHaveBeenCalledWith(
      'gallery/image',
      undefined,
    );
    expect(fileUpload.deleteResourceFromCloudinary).toHaveBeenCalledWith(
      'business-referrals/referral-image',
      undefined,
    );
  });

  it('requires admins to select a profile for a dual-profile account', async () => {
    const { userService } = createDeletionService();

    await expect(userService.deleteUser(accountId.toString())).rejects.toThrow(
      'profileRole is required when the account has multiple profiles',
    );
  });

  it('deletes the account and both-side references when its last profile is deleted', async () => {
    const models = createDeletionService();
    models.account.roles = ['user'];
    models.account.businessProfile = undefined as any;

    const result = await models.userService.deleteOwnProfile(
      accountId.toString(),
      'user',
    );

    expect(result).toMatchObject({
      deletedProfile: 'user',
      accountDeleted: true,
    });
    expect(models.quoteModel.deleteMany).toHaveBeenCalledWith({
      userId: accountId,
    });
    expect(models.quoteModel.deleteMany).toHaveBeenCalledWith({
      businessOwnerId: accountId,
    });
    expect(models.messageModel.deleteMany).toHaveBeenCalledWith({
      $or: [{ senderId: accountId }, { recipientId: accountId }],
    });
    expect(models.contactModel.updateMany).toHaveBeenCalledWith(
      { repliedById: accountId },
      expect.any(Object),
    );
    expect(models.userModel.findByIdAndDelete).toHaveBeenCalledWith(accountId);
    expect(models.userModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

describe('UserService public username profile', () => {
  it('resolves a public service slug without exposing the service id', () => {
    const serviceId = new Types.ObjectId().toString();
    const service = new UserService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const resolvedServiceId = (service as any).resolveServiceIdBySlug(
      [{ id: serviceId, title: 'Emergency Plumbing & Repair' }],
      'emergency-plumbing-repair',
    );

    expect(resolvedServiceId).toBe(serviceId);
  });

  it('returns a shareable URL and complete public business profile data', async () => {
    const ownerId = new Types.ObjectId();
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-02-01T00:00:00.000Z');
    const businessOwner = {
      id: ownerId.toString(),
      _id: ownerId,
      email: 'account@example.com',
      username: 'jolynn',
      role: 'businessOwner',
      roles: ['businessOwner'],
      status: 'active',
      businessProfile: {
        businessName: 'Jolynn Services',
        ownerName: 'Jolynn',
        businessEmail: 'contact@example.com',
        businessWebsiteUrl: 'https://example.com',
        serviceArea: 'Dhaka',
        category: 'Home Services',
        phoneNumber: '123456789',
        country: 'Bangladesh',
        city: 'Dhaka',
        state: 'Dhaka',
        address: 'Main Road',
        postcode: '1200',
        profilePicture: 'profile.jpg',
        backgroundImage: 'background.jpg',
        bio: 'Professional services',
        status: 'active',
      },
      get: jest.fn((field: string) =>
        field === 'createdAt' ? createdAt : updatedAt,
      ),
    };
    const services = [{ id: 'service-id', title: 'Plumbing' }];
    const gallery = [{ id: 'gallery-id', title: 'Projects', images: [{}] }];
    const userModel = {
      findOne: jest.fn().mockResolvedValue(businessOwner),
    };
    const serviceModel = {
      find: jest.fn().mockReturnValue(createQuery(services)),
    };
    const reviewModel = {
      aggregate: jest.fn().mockResolvedValue([
        {
          averageRating: 4.5,
          totalReviews: 2,
          fiveStar: 1,
          fourStar: 1,
          threeStar: 0,
          twoStar: 0,
          oneStar: 0,
        },
      ]),
    };
    const gallaryModel = {
      find: jest.fn().mockReturnValue(createQuery(gallery)),
    };
    const referralId = new Types.ObjectId();
    const businessReferralModel = {
      findOne: jest.fn().mockResolvedValue({
        _id: referralId,
        id: referralId.toString(),
        slug: 'jolynn-services-dhaka-12345678',
        referredByUserId: new Types.ObjectId(),
        referrerName: 'Helpful Member',
        referrerAvatar: 'referrer.jpg',
        rating: 5,
        review: 'Excellent and dependable service.',
        claimedAt: new Date('2026-03-01T00:00:00.000Z'),
      }),
    };
    const service = new UserService(
      userModel as any,
      serviceModel as any,
      {} as any,
      reviewModel as any,
      gallaryModel as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      businessReferralModel as any,
      {} as any,
    );

    const result = await service.getPublicBusinessProfileByUsername('JOLYNN');

    expect(userModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        $and: expect.arrayContaining([{ username: 'jolynn' }]),
      }),
    );
    expect(serviceModel.find).toHaveBeenCalledWith({
      ownerId,
    });
    expect(result).toEqual(
      expect.objectContaining({
        profileUrl: '/jolynn',
        legacyProfileUrl: `/services/businesses/${ownerId}`,
        profile: expect.objectContaining({
          id: ownerId.toString(),
          username: 'jolynn',
          profileUrl: '/jolynn',
          businessName: 'Jolynn Services',
          email: 'contact@example.com',
          postcode: '1200',
          status: 'active',
        }),
        summary: {
          totalServices: 1,
          totalGalleryImages: 1,
          averageRating: 4.5,
          totalReviews: 2,
          ratingBreakdown: {
            5: 1,
            4: 1,
            3: 0,
            2: 0,
            1: 0,
          },
        },
        services,
        gallery,
        viewedService: null,
        referral: expect.objectContaining({
          id: referralId.toString(),
          profileUrl: '/business-referrals/jolynn-services-dhaka-12345678',
          referredBy: expect.objectContaining({ name: 'Helpful Member' }),
          rating: 5,
        }),
      }),
    );
  });
});
