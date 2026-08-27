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

import { Types } from 'mongoose';
import { UserService } from './user.service';

const createQuery = <T>(value: T) => {
  const query: Record<string, any> = {};
  const promise = Promise.resolve(value);

  query.sort = jest.fn(() => query);
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
    );
    return { service, userModel };
  }

  it('updates only businessProfile fields in business mode', async () => {
    const { service, userModel } = createService();

    await service.updateMyProfile('account-id', 'businessOwner', {
      businessName: 'Updated Business',
      firstName: 'Not Allowed',
    } as any);

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'account-id',
      {
        $set: {
          'businessProfile.businessName': 'Updated Business',
        },
      },
      { new: true, runValidators: true },
    );
  });

  it('updates only userProfile fields in user mode', async () => {
    const { service, userModel } = createService();

    await service.updateMyProfile('account-id', 'user', {
      firstName: 'Updated Personal',
      businessName: 'Not Allowed',
    } as any);

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'account-id',
      {
        $set: {
          'userProfile.firstName': 'Updated Personal',
        },
      },
      { new: true, runValidators: true },
    );
  });
});

describe('UserService public username profile', () => {
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
    const service = new UserService(
      userModel as any,
      serviceModel as any,
      {} as any,
      reviewModel as any,
      gallaryModel as any,
      {} as any,
      {} as any,
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
      status: 'active',
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
      }),
    );
  });
});
