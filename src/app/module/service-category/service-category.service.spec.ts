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
});
