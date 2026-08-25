jest.mock('./entities/service-category.entity', () => ({
  ServiceCategory: class ServiceCategory {},
}));
jest.mock('../service/entities/service.entity', () => ({
  BusinessService: class BusinessService {},
}));
jest.mock('../help-wanted/entities/help-wanted.entity', () => ({
  HelpWanted: class HelpWanted {},
}));
jest.mock('../user/entities/user.entity', () => ({
  User: class User {},
}));
jest.mock('src/app/helpers/sendMailer', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

import { Types } from 'mongoose';
import sendMailer from 'src/app/helpers/sendMailer';
import { ServiceCategoryService } from './service-category.service';

describe('ServiceCategoryService', () => {
  it('normalizes and deduplicates category keywords on create', async () => {
    const serviceCategoryModel = {
      findOne: jest.fn().mockResolvedValue(null),
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockImplementation((payload) => payload),
    };
    const service = new ServiceCategoryService(
      serviceCategoryModel as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.createServiceCategory({
      name: 'Plumbing',
      keywords: [' Home Service ', 'home   service', 'House Maintenance'],
    });

    expect(serviceCategoryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        keywords: ['home service', 'house maintenance'],
      }),
    );
  });

  it('blocks a second new category while another request is pending', async () => {
    const pendingOwnerQuery = {
      select: jest.fn().mockResolvedValue({ requestedCategory: 'Religion' }),
    };
    const pendingServiceQuery = {
      select: jest.fn().mockResolvedValue(null),
    };
    const serviceCategoryModel = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    const businessServiceModel = {
      findOne: jest.fn().mockReturnValue(pendingServiceQuery),
    };
    const userModel = {
      findOne: jest.fn().mockReturnValue(pendingOwnerQuery),
    };
    const service = new ServiceCategoryService(
      serviceCategoryModel as any,
      businessServiceModel as any,
      {} as any,
      userModel as any,
    );

    await expect(
      service.requestServiceCategory(
        'Community Services',
        'business_registration',
        '507f1f77bcf86cd799439011',
      ),
    ).rejects.toThrow(
      'Your category request "Religion" is currently subject to admin review',
    );
    expect(serviceCategoryModel.findOne).toHaveBeenCalledTimes(1);
  });

  it('emails every affected business owner when an Other category is approved', async () => {
    const categoryId = new Types.ObjectId();
    const firstOwnerId = new Types.ObjectId();
    const secondOwnerId = new Types.ObjectId();
    const category = {
      id: categoryId.toString(),
      _id: categoryId,
      name: 'Bird Control',
      status: 'pending',
    };
    const updatedCategory = { ...category, status: 'approved' };
    const businessOwners = [
      {
        _id: firstOwnerId,
        email: 'first@example.com',
        firstName: 'First',
        lastName: 'Owner',
        businessName: 'First Pest Control',
      },
      {
        _id: secondOwnerId,
        email: 'second@example.com',
        firstName: 'Second',
        lastName: 'Owner',
        businessName: 'Second Pest Control',
      },
    ];
    const ownerQuery = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(businessOwners),
    };
    const serviceCategoryModel = {
      findById: jest.fn().mockResolvedValue(category),
      findByIdAndUpdate: jest.fn().mockResolvedValue(updatedCategory),
    };
    const businessServiceModel = {
      distinct: jest.fn().mockResolvedValue([firstOwnerId, secondOwnerId]),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
    };
    const helpWantedModel = {
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    };
    const userModel = {
      find: jest.fn().mockReturnValue(ownerQuery),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const service = new ServiceCategoryService(
      serviceCategoryModel as any,
      businessServiceModel as any,
      helpWantedModel as any,
      userModel as any,
    );

    await service.updateServiceCategoryStatus(
      categoryId.toString(),
      'approved',
      new Types.ObjectId().toString(),
    );

    expect(sendMailer).toHaveBeenCalledTimes(2);
    expect(sendMailer).toHaveBeenCalledWith(
      'first@example.com',
      'Your business is ready on SideQuote',
      expect.stringContaining('Your Business Is Ready!'),
    );
    const firstEmailHtml = (sendMailer as jest.Mock).mock.calls[0][2];
    expect(firstEmailHtml).toContain('Bird Control');
    expect(firstEmailHtml).toContain('#30377e');
    expect(firstEmailHtml).toContain('#078bd6');
    expect(firstEmailHtml).toContain('https://sidequote.cloud/privacy-policy');
    expect(firstEmailHtml).toContain(
      'https://sidequote.cloud/terms-and-condition',
    );
  });
});
