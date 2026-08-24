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
});
