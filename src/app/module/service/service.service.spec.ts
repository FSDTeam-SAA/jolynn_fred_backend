jest.mock('./entities/service.entity', () => ({
  BusinessService: class BusinessService {},
}));
jest.mock('../user/entities/user.entity', () => ({
  User: class User {},
}));
jest.mock('../reviews/entities/review.entity', () => ({
  Review: class Review {},
}));
jest.mock('../service-category/entities/service-category.entity', () => ({
  ServiceCategory: class ServiceCategory {},
}));

import { Types } from 'mongoose';
import { ServiceService } from './service.service';

const createQuery = <T>(value: T) => {
  const query: Record<string, any> = {};
  const promise = Promise.resolve(value);

  query.select = jest.fn(() => query);
  query.sort = jest.fn(() => query);
  query.distinct = jest.fn().mockResolvedValue(value);
  query.then = promise.then.bind(promise);
  query.catch = promise.catch.bind(promise);

  return query;
};

describe('ServiceService global business search', () => {
  it('returns an owner matched by a category keyword without requiring a profile match', async () => {
    const categoryId = new Types.ObjectId();
    const ownerId = new Types.ObjectId();
    const approvedCategoryQuery = createQuery([categoryId]);
    const keywordCategoryQuery = createQuery([categoryId]);
    const matchedService = {
      id: new Types.ObjectId().toString(),
      ownerId,
      title: 'Plumbing',
      description: 'Residential plumbing repairs',
      createdAt: new Date(),
    };
    const owner = {
      id: ownerId.toString(),
      email: 'plumber@example.com',
      businessName: 'Reliable Plumbing',
      role: 'businessOwner',
      status: 'active',
      createdAt: new Date(),
    };
    const serviceModel = {
      find: jest.fn().mockReturnValue(createQuery([matchedService])),
    };
    const userModel = {
      find: jest
        .fn()
        .mockReturnValueOnce(createQuery([]))
        .mockReturnValueOnce(createQuery([owner])),
    };
    const reviewModel = {
      aggregate: jest.fn().mockResolvedValue([]),
    };
    const serviceCategoryModel = {
      find: jest
        .fn()
        .mockReturnValueOnce(approvedCategoryQuery)
        .mockReturnValueOnce(keywordCategoryQuery),
    };
    const service = new ServiceService(
      serviceModel as any,
      userModel as any,
      reviewModel as any,
      serviceCategoryModel as any,
      {} as any,
    );

    const result = await service.searchBusinessOwnersByService(
      { searchTerm: 'Home Service' },
      { page: 1, limit: 10 },
    );

    expect(result.meta.total).toBe(1);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        businessOwnerId: ownerId.toString(),
        businessName: 'Reliable Plumbing',
        service: expect.objectContaining({ title: 'Plumbing' }),
      }),
    );

    const keywordSearchConditions = serviceCategoryModel.find.mock.calls[1][0];
    expect(keywordSearchConditions).toEqual(
      expect.objectContaining({
        status: 'approved',
        isActive: true,
        $or: expect.arrayContaining([
          { keywords: { $regex: expect.any(RegExp) } },
        ]),
      }),
    );

    const finalOwnerConditions = userModel.find.mock.calls[1][0];
    expect(finalOwnerConditions.$and).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ $or: expect.anything() }),
      ]),
    );
  });
});
