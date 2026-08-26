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

import { UserService } from './user.service';

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
