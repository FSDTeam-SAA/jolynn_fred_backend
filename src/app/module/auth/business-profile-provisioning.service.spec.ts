import { HttpException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BusinessProfileProvisioningService } from './business-profile-provisioning.service';

describe('BusinessProfileProvisioningService', () => {
  const userId = new Types.ObjectId();
  const categoryId = new Types.ObjectId();
  let userModel: Record<string, jest.Mock>;
  let businessServiceModel: Record<string, jest.Mock>;
  let service: BusinessProfileProvisioningService;

  const input = () => ({
    businessName: 'Acme Plumbing',
    ownerName: 'Jane Owner',
    businessEmail: 'owner@acme.example',
    city: 'Austin',
    state: 'Texas',
    category: 'Plumbing',
    serviceCategoryId: categoryId,
    status: 'active' as const,
  });

  beforeEach(() => {
    userModel = {
      findById: jest.fn().mockResolvedValue({
        _id: userId,
        id: userId.toString(),
        email: 'owner@acme.example',
        role: 'user',
        roles: ['user'],
        accountStatus: 'active',
      }),
      findByIdAndUpdate: jest.fn().mockResolvedValue({
        _id: userId,
        id: userId.toString(),
        email: 'owner@acme.example',
        role: 'user',
        roles: ['user', 'businessOwner'],
        businessProfile: input(),
      }),
    };
    businessServiceModel = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          ownerId: userId,
          title: 'Plumbing',
        },
      ]),
      findByIdAndDelete: jest.fn().mockResolvedValue({}),
    };
    service = new BusinessProfileProvisioningService(
      userModel as any,
      businessServiceModel as any,
    );
  });

  it('adds a business profile, role, and default service to a personal account', async () => {
    const result = await service.provisionForExistingAccount(userId, input());

    expect(businessServiceModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          ownerId: userId,
          title: 'Plumbing',
          serviceCategoryId: categoryId,
          status: 'active',
        }),
      ],
      {},
    );
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        $set: {
          businessProfile: expect.objectContaining({
            businessName: 'Acme Plumbing',
            businessEmail: 'owner@acme.example',
          }),
        },
      }),
      expect.objectContaining({ new: true, runValidators: true }),
    );
    expect(result.user.roles).toContain('businessOwner');
  });

  it('rejects overwriting an existing business with another email', async () => {
    userModel.findById.mockResolvedValue({
      _id: userId,
      email: 'owner@acme.example',
      role: 'businessOwner',
      roles: ['businessOwner'],
      accountStatus: 'active',
      businessProfile: {
        businessName: 'Different Business',
        businessEmail: 'different@example.com',
        status: 'active',
      },
    });

    await expect(
      service.provisionForExistingAccount(userId, input(), {
        allowExistingBusinessProfile: true,
      }),
    ).rejects.toMatchObject<HttpException>({ status: 409 });
    expect(businessServiceModel.create).not.toHaveBeenCalled();
  });

  it('removes a newly created service when non-transactional profile persistence fails', async () => {
    userModel.findByIdAndUpdate.mockRejectedValue(
      new Error('profile persistence failed'),
    );

    await expect(
      service.provisionForExistingAccount(userId, input()),
    ).rejects.toThrow('profile persistence failed');
    expect(businessServiceModel.findByIdAndDelete).toHaveBeenCalledWith(
      expect.any(Types.ObjectId),
    );
  });
});
