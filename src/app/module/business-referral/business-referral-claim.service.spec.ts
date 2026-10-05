import { HttpException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BusinessReferralClaimService } from './business-referral-claim.service';

const sessionQuery = <T>(result: T) => ({
  select: jest.fn().mockReturnThis(),
  session: jest.fn().mockResolvedValue(result),
});

describe('BusinessReferralClaimService', () => {
  const referralId = new Types.ObjectId();
  const userId = new Types.ObjectId();
  const claimId = new Types.ObjectId();
  const categoryId = new Types.ObjectId();
  const token = 'a'.repeat(64);
  let session: { withTransaction: jest.Mock; endSession: jest.Mock };
  let connection: { startSession: jest.Mock };
  let referral: Record<string, any>;
  let user: Record<string, any>;
  let claim: Record<string, any>;
  let referralModel: Record<string, jest.Mock>;
  let claimModel: Record<string, jest.Mock>;
  let userModel: Record<string, jest.Mock>;
  let reviewModel: Record<string, jest.Mock>;
  let provisioningService: { provisionForExistingAccount: jest.Mock };
  let service: BusinessReferralClaimService;

  const dto = () => ({
    claimToken: token,
    businessEmail: 'owner@acme.example',
    ownerName: 'Jane Owner',
    businessWebsiteUrl: 'https://acme.example',
    address: '1 Main Street',
    serviceArea: 'Austin',
    bio: 'Professional plumbing services.',
  });

  beforeEach(() => {
    session = {
      withTransaction: jest.fn(async (callback) => callback()),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    connection = { startSession: jest.fn().mockResolvedValue(session) };
    referral = {
      _id: referralId,
      id: referralId.toString(),
      businessName: 'Acme Plumbing',
      businessEmail: 'owner@acme.example',
      businessPhone: '15125550100',
      categoryName: 'Plumbing',
      serviceCategoryId: categoryId,
      city: 'Austin',
      state: 'Texas',
      image: { url: 'https://example.com/referral.jpg' },
      referrerName: 'Helpful User',
      referrerAvatar: 'https://example.com/avatar.jpg',
      referredByUserId: new Types.ObjectId(),
      rating: 5,
      review: 'Excellent and dependable plumbing service.',
      get: jest.fn().mockReturnValue(new Date('2026-10-05T00:00:00.000Z')),
      listingStatus: 'published',
      claimStatus: 'unclaimed',
    };
    user = {
      _id: userId,
      id: userId.toString(),
      email: 'owner@acme.example',
      emailVerified: true,
      username: 'acme_owner',
      role: 'user',
      roles: ['user'],
    };
    claim = {
      _id: claimId,
      referralId,
      businessEmail: 'owner@acme.example',
      expiresAt: new Date(Date.now() + 60_000),
      status: 'pending_verification',
    };
    referralModel = {
      findById: jest.fn().mockReturnValue(sessionQuery(referral)),
      findOne: jest.fn().mockReturnValue(sessionQuery(null)),
      findOneAndUpdate: jest.fn().mockResolvedValue({
        ...referral,
        claimStatus: 'claimed',
        claimedByUserId: userId,
      }),
    };
    claimModel = {
      findOne: jest.fn().mockReturnValue(sessionQuery(claim)),
      findOneAndUpdate: jest
        .fn()
        .mockResolvedValueOnce({ ...claim, claimantUserId: userId })
        .mockResolvedValueOnce({
          ...claim,
          claimantUserId: userId,
          status: 'approved',
        }),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    userModel = {
      findById: jest.fn().mockReturnValue(sessionQuery(user)),
    };
    reviewModel = {
      findOne: jest.fn().mockReturnValue(sessionQuery(null)),
      findByIdAndUpdate: jest.fn(),
      create: jest.fn().mockResolvedValue([{ _id: new Types.ObjectId() }]),
    };
    provisioningService = {
      provisionForExistingAccount: jest.fn().mockResolvedValue({
        user: { ...user, roles: ['user', 'businessOwner'] },
        businessService: { _id: new Types.ObjectId() },
      }),
    };
    service = new BusinessReferralClaimService(
      connection as any,
      referralModel as any,
      claimModel as any,
      userModel as any,
      reviewModel as any,
      provisioningService as any,
    );
  });

  it('atomically provisions and links a verified matching-email claimant', async () => {
    const result = await service.claimBusiness(
      referralId.toString(),
      userId.toString(),
      dto(),
    );

    expect(session.withTransaction).toHaveBeenCalledTimes(1);
    expect(
      provisioningService.provisionForExistingAccount,
    ).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        businessName: 'Acme Plumbing',
        businessEmail: 'owner@acme.example',
        sourceReferralId: referralId,
        profilePicture: 'https://example.com/referral.jpg',
      }),
      expect.objectContaining({
        allowExistingBusinessProfile: true,
        session,
      }),
    );
    expect(referralModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: referralId, claimStatus: 'unclaimed' },
      expect.objectContaining({
        $set: expect.objectContaining({
          claimStatus: 'claimed',
          claimedByUserId: userId,
        }),
      }),
      { new: true, session },
    );
    expect(reviewModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          sourceReferralId: referralId,
          businessId: userId,
          reviewerId: referral.referredByUserId,
          rating: 5,
          message: 'Excellent and dependable plumbing service.',
        }),
      ],
      { session },
    );
    expect(result).toMatchObject({
      claimStatus: 'claimed',
      businessOwnerId: userId.toString(),
      activeRole: 'businessOwner',
      nextAction: 'switch_profile',
      idempotent: false,
    });
    expect(session.endSession).toHaveBeenCalled();
  });

  it('rejects an authenticated account whose verified email does not match', async () => {
    user.email = 'someone-else@example.com';

    await expect(
      service.claimBusiness(referralId.toString(), userId.toString(), dto()),
    ).rejects.toMatchObject<HttpException>({ status: 403 });
    expect(
      provisioningService.provisionForExistingAccount,
    ).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });

  it('does not create a second converted review when one already exists', async () => {
    reviewModel.findOne.mockReturnValueOnce(
      sessionQuery({ _id: new Types.ObjectId(), sourceReferralId: referralId }),
    );

    await service.claimBusiness(
      referralId.toString(),
      userId.toString(),
      dto(),
    );

    expect(reviewModel.create).not.toHaveBeenCalled();
    expect(reviewModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects an account with an unverified email', async () => {
    user.emailVerified = false;

    await expect(
      service.claimBusiness(referralId.toString(), userId.toString(), dto()),
    ).rejects.toMatchObject<HttpException>({ status: 403 });
    expect(
      provisioningService.provisionForExistingAccount,
    ).not.toHaveBeenCalled();
  });

  it('returns the prior success for an idempotent retry by the same owner', async () => {
    claim.status = 'approved';
    claim.claimantUserId = userId;
    referral.claimStatus = 'claimed';
    referral.claimedByUserId = userId;

    await expect(
      service.claimBusiness(referralId.toString(), userId.toString(), dto()),
    ).resolves.toMatchObject({
      claimStatus: 'claimed',
      businessOwnerId: userId.toString(),
      idempotent: true,
    });
    expect(
      provisioningService.provisionForExistingAccount,
    ).not.toHaveBeenCalled();
    expect(claimModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('expires an outdated claim token without provisioning a profile', async () => {
    claim.expiresAt = new Date(Date.now() - 1_000);

    await expect(
      service.claimBusiness(referralId.toString(), userId.toString(), dto()),
    ).rejects.toMatchObject<HttpException>({ status: 410 });
    expect(claimModel.updateOne).toHaveBeenCalledWith(
      { _id: claimId },
      { $set: { status: 'expired' } },
    );
    expect(
      provisioningService.provisionForExistingAccount,
    ).not.toHaveBeenCalled();
  });
});
