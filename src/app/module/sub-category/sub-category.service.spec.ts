jest.mock('./entities/sub-category.entity', () => ({
  SubCategory: class SubCategory {},
}));
jest.mock('../service/entities/service.entity', () => ({
  BusinessService: class BusinessService {},
}));

import { Types } from 'mongoose';
import { SubCategoryService } from './sub-category.service';

describe('SubCategoryService', () => {
  it('creates multiple subcategories under an owned service and skips duplicates', async () => {
    const serviceId = new Types.ObjectId();
    const ownerId = new Types.ObjectId();
    const existing = {
      _id: new Types.ObjectId(),
      serviceId,
      subcategory: 'Pipe Repair',
    };
    const created = {
      _id: new Types.ObjectId(),
      serviceId,
      subcategory: 'Drain Cleaning',
    };
    const existingQuery = {
      collation: jest.fn().mockResolvedValue([existing]),
    };
    const resultQuery = {
      collation: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([created, existing]),
    };
    const subCategoryModel = {
      find: jest
        .fn()
        .mockReturnValueOnce(existingQuery)
        .mockReturnValueOnce(resultQuery),
      insertMany: jest.fn().mockResolvedValue([created]),
    };
    const businessServiceModel = {
      findById: jest.fn().mockResolvedValue({
        _id: serviceId,
        ownerId,
      }),
    };
    const service = new SubCategoryService(
      subCategoryModel as any,
      businessServiceModel as any,
    );

    const result = await service.createSubCategories(
      {
        serviceId: serviceId.toString(),
        subcategories: [' Pipe Repair ', 'pipe repair', 'Drain   Cleaning'],
      },
      ownerId.toString(),
      'businessOwner',
    );

    expect(subCategoryModel.insertMany).toHaveBeenCalledWith([
      { serviceId, subcategory: 'Drain Cleaning' },
    ]);
    expect(result).toEqual([created, existing]);
  });

  it('prevents a business owner from changing another owner service', async () => {
    const serviceId = new Types.ObjectId();
    const service = new SubCategoryService(
      {} as any,
      {
        findById: jest.fn().mockResolvedValue({
          _id: serviceId,
          ownerId: new Types.ObjectId(),
        }),
      } as any,
    );

    await expect(
      service.createSubCategories(
        { serviceId: serviceId.toString(), subcategories: ['Pipe Repair'] },
        new Types.ObjectId().toString(),
        'businessOwner',
      ),
    ).rejects.toThrow(
      'You are not allowed to manage subcategories for this service',
    );
  });
});
