import { HttpException } from '@nestjs/common';
import { Types } from 'mongoose';
import { fileUpload } from 'src/app/helpers/fileUploder';
import { BusinessReferralService } from './business-referral.service';

const createQuery = <T>(result: T) => ({
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(result),
  then: Promise.resolve(result).then.bind(Promise.resolve(result)),
  catch: Promise.resolve(result).catch.bind(Promise.resolve(result)),
});

describe('BusinessReferralService', () => {
  const referrerId = new Types.ObjectId();
  const categoryId = new Types.ObjectId();
  let referralModel: Record<string, jest.Mock>;
  let userModel: Record<string, jest.Mock>;
  let categoryModel: Record<string, jest.Mock>;
  let locationService: { validateStateAndCity: jest.Mock };
  let notificationService: { sendClaimNotification: jest.Mock };
  let service: BusinessReferralService;

  beforeEach(() => {
    referralModel = {
      findOne: jest.fn().mockReturnValue(createQuery(null)),
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
    };
    userModel = {
      findById: jest.fn().mockResolvedValue({
        _id: referrerId,
        id: referrerId.toString(),
        email: 'user@example.com',
        username: 'helpful_user',
        role: 'user',
        roles: ['user'],
        userProfile: {
          firstName: 'Helpful',
          lastName: 'User',
          profilePicture: 'https://example.com/avatar.jpg',
        },
      }),
      findOne: jest.fn().mockReturnValue(createQuery(null)),
    };
    categoryModel = {
      findOne: jest.fn().mockResolvedValue({
        _id: categoryId,
        name: 'Plumbing',
        status: 'approved',
        isActive: true,
      }),
    };
    locationService = {
      validateStateAndCity: jest.fn().mockResolvedValue({
        state: 'Texas',
        city: 'Austin',
      }),
    };
    notificationService = {
      sendClaimNotification: jest.fn().mockResolvedValue(null),
    };
    service = new BusinessReferralService(
      referralModel as any,
      userModel as any,
      categoryModel as any,
      locationService as any,
      notificationService as any,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a normalized public referral and keeps delivery data private to the referrer', async () => {
    jest.spyOn(fileUpload, 'uploadBusinessReferralImage').mockResolvedValue({
      url: 'https://example.com/referral.jpg',
      public_id: 'business-referrals/referral',
    });
    referralModel.create.mockImplementation(async (payload) => {
      const _id = new Types.ObjectId();
      return {
        _id,
        toObject: () => ({
          _id,
          ...payload,
          createdAt: new Date('2026-10-05T00:00:00.000Z'),
          updatedAt: new Date('2026-10-05T00:00:00.000Z'),
        }),
      };
    });

    const result = await service.createReferral(
      referrerId.toString(),
      {
        businessName: 'Acme Plumbing',
        serviceCategoryId: categoryId.toString(),
        state: 'Texas',
        city: 'Austin',
        businessEmail: 'owner@acme.example',
        businessPhone: '+1 (512) 555-0100',
        rating: 5,
        review: 'Excellent and dependable plumbing service.',
      },
      { buffer: Buffer.from('image'), mimetype: 'image/jpeg' } as any,
    );

    expect(referralModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        normalizedBusinessName: 'acme plumbing',
        normalizedState: 'texas',
        normalizedCity: 'austin',
        businessPhone: '15125550100',
        categoryName: 'Plumbing',
        referrerName: 'Helpful User',
        claimStatus: 'unclaimed',
      }),
    );
    expect(result).toMatchObject({
      businessName: 'Acme Plumbing',
      businessEmail: 'owner@acme.example',
      businessPhone: '15125550100',
      isClaimable: true,
      emailDeliveryStatus: 'pending',
    });
    expect(result).not.toHaveProperty('image.publicId');
    expect(notificationService.sendClaimNotification).toHaveBeenCalledWith(
      expect.any(Types.ObjectId),
    );
  });

  it('keeps a published referral when notification delivery throws', async () => {
    jest.spyOn(fileUpload, 'uploadBusinessReferralImage').mockResolvedValue({
      url: 'https://example.com/referral.jpg',
      public_id: 'business-referrals/referral',
    });
    referralModel.create.mockImplementation(async (payload) => {
      const _id = new Types.ObjectId();
      return {
        _id,
        toObject: () => ({
          _id,
          ...payload,
        }),
      };
    });
    notificationService.sendClaimNotification.mockRejectedValue(
      new Error('email provider unavailable'),
    );

    await expect(
      service.createReferral(
        referrerId.toString(),
        {
          businessName: 'Acme Plumbing',
          serviceCategoryId: categoryId.toString(),
          state: 'Texas',
          city: 'Austin',
          businessEmail: 'owner@acme.example',
          rating: 5,
          review: 'Excellent and dependable plumbing service.',
        },
        { buffer: Buffer.from('image'), mimetype: 'image/jpeg' } as any,
      ),
    ).resolves.toMatchObject({
      businessName: 'Acme Plumbing',
      emailDeliveryStatus: 'pending',
    });
    expect(referralModel.create).toHaveBeenCalledTimes(1);
  });

  it('blocks a duplicate referral before uploading an image', async () => {
    referralModel.findOne.mockReturnValue(
      createQuery({
        businessName: 'Acme Plumbing',
        slug: 'acme-plumbing-austin-12345678',
        claimStatus: 'unclaimed',
      }),
    );
    const uploadSpy = jest.spyOn(fileUpload, 'uploadBusinessReferralImage');

    await expect(
      service.createReferral(
        referrerId.toString(),
        {
          businessName: 'Acme Plumbing',
          serviceCategoryId: categoryId.toString(),
          state: 'Texas',
          city: 'Austin',
          businessEmail: 'owner@acme.example',
          rating: 5,
          review: 'Excellent and dependable plumbing service.',
        },
        { buffer: Buffer.from('image'), mimetype: 'image/jpeg' } as any,
      ),
    ).rejects.toMatchObject<HttpException>({ status: 409 });
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('removes the uploaded image when database persistence fails', async () => {
    jest.spyOn(fileUpload, 'uploadBusinessReferralImage').mockResolvedValue({
      url: 'https://example.com/referral.jpg',
      public_id: 'business-referrals/referral',
    });
    const deleteSpy = jest
      .spyOn(fileUpload, 'deleteResourceFromCloudinary')
      .mockResolvedValue();
    referralModel.create.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.createReferral(
        referrerId.toString(),
        {
          businessName: 'Acme Plumbing',
          serviceCategoryId: categoryId.toString(),
          state: 'Texas',
          city: 'Austin',
          businessEmail: 'owner@acme.example',
          rating: 5,
          review: 'Excellent and dependable plumbing service.',
        },
        { buffer: Buffer.from('image'), mimetype: 'image/jpeg' } as any,
      ),
    ).rejects.toThrow('database unavailable');
    expect(deleteSpy).toHaveBeenCalledWith('business-referrals/referral');
  });

  it('keeps the referral URL stable and includes live owner data after claim', async () => {
    const ownerId = new Types.ObjectId();
    const referralId = new Types.ObjectId();
    const referral = {
      _id: referralId,
      slug: 'acme-plumbing-austin-12345678',
      businessName: 'Acme Plumbing',
      businessEmail: 'owner@acme.example',
      image: { url: 'https://example.com/referral.jpg' },
      serviceCategoryId: categoryId,
      categoryName: 'Plumbing',
      state: 'Texas',
      city: 'Austin',
      rating: 5,
      review: 'Excellent and dependable plumbing service.',
      listingStatus: 'published',
      claimStatus: 'claimed',
      claimedByUserId: ownerId,
      referrerName: 'Helpful User',
      toObject: jest.fn(function (this: Record<string, unknown>) {
        return { ...this, toObject: undefined };
      }),
    };
    referralModel.findOne.mockReturnValue(createQuery(referral));
    userModel.findById.mockResolvedValue({
      _id: ownerId,
      id: ownerId.toString(),
      username: 'acme_owner',
      role: 'businessOwner',
      roles: ['businessOwner'],
      businessProfile: {
        businessName: 'Acme Plumbing and Heating',
        ownerName: 'Jane Owner',
        businessEmail: 'contact@acme.example',
        phoneNumber: '15125550101',
        category: 'Plumbing',
        city: 'Austin',
        state: 'Texas',
      },
    });

    await expect(
      service.getPublicReferralBySlug(referral.slug),
    ).resolves.toMatchObject({
      profileUrl: `/business-referrals/${referral.slug}`,
      isVerified: true,
      canonicalProfileUrl: '/acme_owner',
      referredBy: { name: 'Helpful User' },
      ownerManagedProfile: {
        id: ownerId.toString(),
        businessName: 'Acme Plumbing and Heating',
        businessEmail: 'contact@acme.example',
      },
    });
  });

  it('lets only the original referrer correct an unclaimed email and rotates the claim notification', async () => {
    const referralId = new Types.ObjectId();
    const referral = {
      _id: referralId,
      businessName: 'Acme Plumbing',
      businessEmail: 'mistyped@acme.example',
      businessPhone: '15125550100',
      serviceCategoryId: categoryId,
      categoryName: 'Plumbing',
      state: 'Texas',
      city: 'Austin',
      image: { url: 'https://example.com/referral.jpg' },
      rating: 5,
      review: 'Excellent and dependable plumbing service.',
      referrerName: 'Helpful User',
      listingStatus: 'published',
      claimStatus: 'unclaimed',
    };
    const deliveredReferral = {
      ...referral,
      businessEmail: 'owner@acme.example',
      emailDeliveryStatus: 'sent',
      emailDeliveryAttempts: 2,
    };
    referralModel.findOne
      .mockReturnValueOnce(createQuery(referral))
      .mockReturnValueOnce(createQuery(null));
    referralModel.findOneAndUpdate.mockResolvedValue({
      ...referral,
      businessEmail: 'owner@acme.example',
      emailDeliveryStatus: 'pending',
    });
    notificationService.sendClaimNotification.mockResolvedValue(
      deliveredReferral,
    );

    const result = await service.updateUnclaimedReferralEmail(
      referralId.toString(),
      referrerId.toString(),
      { businessEmail: 'OWNER@ACME.EXAMPLE' },
    );

    expect(referralModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: referralId,
        referredByUserId: referrerId,
        claimStatus: 'unclaimed',
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          businessEmail: 'owner@acme.example',
          emailDeliveryStatus: 'pending',
        }),
      }),
      { new: true, runValidators: true },
    );
    expect(notificationService.sendClaimNotification).toHaveBeenCalledWith(
      referralId,
    );
    expect(result).toMatchObject({
      businessEmail: 'owner@acme.example',
      emailDeliveryStatus: 'sent',
      emailDeliveryAttempts: 2,
    });
  });

  it('blocks an email correction that would duplicate another referral', async () => {
    const referralId = new Types.ObjectId();
    referralModel.findOne
      .mockReturnValueOnce(
        createQuery({
          _id: referralId,
          businessName: 'Acme Plumbing',
          businessEmail: 'mistyped@acme.example',
          state: 'Texas',
          city: 'Austin',
          listingStatus: 'published',
          claimStatus: 'unclaimed',
        }),
      )
      .mockReturnValueOnce(
        createQuery({ businessName: 'Existing Acme', slug: 'existing-acme' }),
      );

    await expect(
      service.updateUnclaimedReferralEmail(
        referralId.toString(),
        referrerId.toString(),
        { businessEmail: 'owner@acme.example' },
      ),
    ).rejects.toMatchObject<HttpException>({ status: 409 });
    expect(referralModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(notificationService.sendClaimNotification).not.toHaveBeenCalled();
  });
});
