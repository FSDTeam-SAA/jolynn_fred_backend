jest.mock('src/app/helpers/sendMailer', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { createHash } from 'crypto';
import { HttpException } from '@nestjs/common';
import { Types } from 'mongoose';
import sendMailer from 'src/app/helpers/sendMailer';
import { BusinessReferralNotificationService } from './business-referral-notification.service';

describe('BusinessReferralNotificationService', () => {
  const referralId = new Types.ObjectId();
  const claimId = new Types.ObjectId();
  let referral: Record<string, any>;
  let referralModel: Record<string, jest.Mock>;
  let claimModel: Record<string, jest.Mock>;
  let service: BusinessReferralNotificationService;

  beforeEach(() => {
    referral = {
      _id: referralId,
      id: referralId.toString(),
      slug: 'acme-plumbing-austin-12345678',
      businessName: 'Acme Plumbing',
      businessEmail: 'owner@acme.example',
      referrerName: 'Helpful User',
      categoryName: 'Plumbing',
      city: 'Austin',
      state: 'Texas',
      listingStatus: 'published',
      claimStatus: 'unclaimed',
    };
    referralModel = {
      findById: jest.fn().mockResolvedValue(referral),
      findByIdAndUpdate: jest
        .fn()
        .mockResolvedValueOnce(referral)
        .mockResolvedValue({
          ...referral,
          emailDeliveryStatus: 'sent',
          emailDeliveryAttempts: 1,
        }),
      findOne: jest.fn(),
    };
    claimModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue({ _id: claimId }),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    service = new BusinessReferralNotificationService(
      referralModel as any,
      claimModel as any,
    );
    (sendMailer as jest.Mock).mockResolvedValue({ id: 'email-1' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('stores only a token hash and emails the raw 72-hour claim token', async () => {
    await service.sendClaimNotification(referralId);

    const claimUpdate = claimModel.findOneAndUpdate.mock.calls[0][1];
    const emailHtml = (sendMailer as jest.Mock).mock.calls[0][2] as string;
    const tokenMatch = emailHtml.match(/token=([a-f0-9]{64})/);

    expect(tokenMatch?.[1]).toHaveLength(64);
    expect(claimUpdate.$set.tokenHash).toBe(
      createHash('sha256').update(tokenMatch![1]).digest('hex'),
    );
    expect(claimUpdate.$set.tokenHash).not.toBe(tokenMatch![1]);
    expect(claimUpdate.$set.expiresAt.getTime() - Date.now()).toBeGreaterThan(
      71 * 60 * 60 * 1000,
    );
    expect(referralModel.findByIdAndUpdate).toHaveBeenLastCalledWith(
      referralId,
      expect.objectContaining({
        $set: expect.objectContaining({
          emailDeliveryStatus: 'sent',
          emailProviderMessageId: 'email-1',
        }),
      }),
      { new: true },
    );
  });

  it('records delivery failure without rejecting the notification operation', async () => {
    (sendMailer as jest.Mock).mockRejectedValue(
      new Error('provider unavailable'),
    );
    referralModel.findByIdAndUpdate
      .mockReset()
      .mockResolvedValueOnce(referral)
      .mockResolvedValueOnce({
        ...referral,
        emailDeliveryStatus: 'failed',
        emailDeliveryAttempts: 1,
      });

    await expect(
      service.sendClaimNotification(referralId),
    ).resolves.toMatchObject({ emailDeliveryStatus: 'failed' });
    expect(referralModel.findByIdAndUpdate).toHaveBeenLastCalledWith(
      referralId,
      expect.objectContaining({
        $set: expect.objectContaining({
          emailDeliveryStatus: 'failed',
          emailDeliveryFailureReason: 'provider unavailable',
        }),
      }),
      { new: true },
    );
  });

  it('validates an unexpired token without consuming it', async () => {
    const token = 'a'.repeat(64);
    claimModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: claimId,
        referralId,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
        status: 'pending_verification',
      }),
    });
    referralModel.findOne.mockResolvedValue(referral);

    await expect(service.verifyClaimToken(token)).resolves.toEqual(
      expect.objectContaining({
        valid: true,
        referralId: referralId.toString(),
        businessName: 'Acme Plumbing',
        requiredAction: 'authenticate_or_register',
      }),
    );
    expect(claimModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('expires an outdated token and returns HTTP 410', async () => {
    const token = 'b'.repeat(64);
    claimModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: claimId,
        referralId,
        expiresAt: new Date(Date.now() - 1_000),
        status: 'pending_verification',
      }),
    });
    claimModel.findByIdAndUpdate.mockResolvedValue({});

    await expect(
      service.verifyClaimToken(token),
    ).rejects.toMatchObject<HttpException>({ status: 410 });
    expect(claimModel.findByIdAndUpdate).toHaveBeenCalledWith(claimId, {
      $set: { status: 'expired' },
    });
  });

  it('rate limits repeated email attempts', async () => {
    referral.emailLastAttemptAt = new Date();

    await expect(
      service.sendClaimNotification(referralId, true),
    ).rejects.toMatchObject<HttpException>({ status: 429 });
    expect(claimModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(sendMailer).not.toHaveBeenCalled();
  });

  it('rotates the stored token when a new notification is sent', async () => {
    await service.sendClaimNotification(referralId);
    await service.sendClaimNotification(referralId);

    const firstHash =
      claimModel.findOneAndUpdate.mock.calls[0][1].$set.tokenHash;
    const secondHash =
      claimModel.findOneAndUpdate.mock.calls[1][1].$set.tokenHash;

    expect(firstHash).not.toBe(secondHash);
    expect(claimModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  it('does not allow another user to resend a referral notification', async () => {
    referralModel.findOne.mockResolvedValue(null);

    await expect(
      service.resendClaimNotification(
        referralId.toString(),
        new Types.ObjectId().toString(),
      ),
    ).rejects.toMatchObject<HttpException>({ status: 404 });
    expect(sendMailer).not.toHaveBeenCalled();
  });
});
