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
  it('normalizes and saves business-specific keywords when creating a service', async () => {
    const categoryId = new Types.ObjectId();
    const ownerId = new Types.ObjectId();
    const serviceModel = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((payload) => payload),
    };
    const serviceCategoryService = {
      resolveCategorySelection: jest.fn().mockResolvedValue({
        _id: categoryId,
        name: 'Plumbing',
        status: 'approved',
      }),
    };
    const service = new ServiceService(
      serviceModel as any,
      {} as any,
      {} as any,
      {} as any,
      serviceCategoryService as any,
    );

    await service.createService(ownerId.toString(), {
      title: 'Plumbing',
      description: 'Residential plumbing repairs',
      keywords: [' Emergency Plumber ', 'emergency   plumber', 'Pipe Repair'],
    });

    expect(serviceModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId,
        serviceCategoryId: categoryId,
        keywords: ['emergency plumber', 'pipe repair'],
      }),
    );
  });

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
      username: 'reliable_plumbing',
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
        username: 'reliable_plumbing',
        profileUrl: '/reliable_plumbing',
        legacyProfileUrl: `/services/businesses/${ownerId}?serviceId=${matchedService.id}`,
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

  it('returns every active profile sharing the same business keyword', async () => {
    const categoryId = new Types.ObjectId();
    const firstOwnerId = new Types.ObjectId();
    const secondOwnerId = new Types.ObjectId();
    const matchingServices = [
      {
        id: new Types.ObjectId().toString(),
        ownerId: firstOwnerId,
        title: 'Plumbing',
        description: 'Residential plumbing repairs',
        createdAt: new Date(),
      },
      {
        id: new Types.ObjectId().toString(),
        ownerId: secondOwnerId,
        title: 'Heating',
        description: 'Home heating services',
        createdAt: new Date(),
      },
    ];
    const owners = [
      {
        id: firstOwnerId.toString(),
        email: 'first@example.com',
        username: 'first_business',
        businessName: 'First Business',
        role: 'businessOwner',
        status: 'active',
        createdAt: new Date(),
      },
      {
        id: secondOwnerId.toString(),
        email: 'second@example.com',
        username: 'second_business',
        businessName: 'Second Business',
        role: 'businessOwner',
        status: 'active',
        createdAt: new Date(),
      },
    ];
    const serviceModel = {
      find: jest.fn().mockReturnValue(createQuery(matchingServices)),
    };
    const userModel = {
      find: jest
        .fn()
        .mockReturnValueOnce(createQuery([]))
        .mockReturnValueOnce(createQuery(owners)),
    };
    const reviewModel = {
      aggregate: jest.fn().mockResolvedValue([]),
    };
    const serviceCategoryModel = {
      find: jest
        .fn()
        .mockReturnValueOnce(createQuery([categoryId]))
        .mockReturnValueOnce(createQuery([])),
    };
    const service = new ServiceService(
      serviceModel as any,
      userModel as any,
      reviewModel as any,
      serviceCategoryModel as any,
      {} as any,
    );

    const result = await service.searchBusinessOwnersByService(
      { searchTerm: 'emergency repair' },
      { page: 1, limit: 10 },
    );

    expect(result.meta.total).toBe(2);
    expect(result.data.map((profile) => profile.businessOwnerId)).toEqual(
      expect.arrayContaining([
        firstOwnerId.toString(),
        secondOwnerId.toString(),
      ]),
    );
    expect(serviceModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          { keywords: { $regex: expect.any(RegExp) } },
        ]),
      }),
    );
  });
});
