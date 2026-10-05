import { BusinessDiscoveryService } from './business-discovery.service';

describe('BusinessDiscoveryService', () => {
  it('returns one global card format and prefers a claimed owner profile over its referral duplicate', async () => {
    const serviceService = {
      findBusinessOwnerDiscoveryCards: jest.fn().mockResolvedValue([
        {
          listingId: 'owner-1',
          businessOwnerId: 'owner-1',
          listingType: 'registered',
          businessName: 'Acme Plumbing',
          profileUrl: '/acme-plumbing',
          rating: 4.5,
          totalReviews: 7,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]),
    };
    const businessReferralService = {
      findPublicReferralDiscoveryCards: jest.fn().mockResolvedValue([
        {
          listingId: 'referral-claimed',
          listingType: 'referred',
          businessOwnerId: 'owner-1',
          businessName: 'Acme Plumbing',
          profileUrl: '/business-referrals/acme-plumbing',
          claimStatus: 'claimed',
          isClaimable: false,
          referredBy: { name: 'Helpful Member' },
          rating: 5,
          totalReviews: 1,
          createdAt: new Date('2026-02-01T00:00:00.000Z'),
        },
        {
          listingId: 'referral-unclaimed',
          listingType: 'referred',
          businessName: 'Bright Electric',
          profileUrl: '/business-referrals/bright-electric',
          claimStatus: 'unclaimed',
          isClaimable: true,
          rating: 5,
          totalReviews: 1,
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
        },
      ]),
    };
    const service = new BusinessDiscoveryService(
      serviceService as any,
      businessReferralService as any,
    );

    const result = await service.search({
      listingType: 'all',
      serviceCategoryId: '507f1f77bcf86cd799439011',
      sortBy: 'rating',
      sortOrder: 'desc',
      page: 1,
      limit: 10,
    });

    expect(serviceService.findBusinessOwnerDiscoveryCards).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceCategoryId: '507f1f77bcf86cd799439011',
      }),
    );
    expect(
      businessReferralService.findPublicReferralDiscoveryCards,
    ).toHaveBeenCalledWith(expect.objectContaining({ listingType: 'all' }));
    expect(result.meta).toEqual({ page: 1, limit: 10, total: 2 });
    expect(result.data).toEqual([
      expect.objectContaining({
        listingId: 'referral-unclaimed',
        listingType: 'referred',
        isClaimable: true,
      }),
      expect.objectContaining({
        listingId: 'owner-1',
        listingType: 'registered',
        claimStatus: 'claimed',
        isClaimable: false,
        referredBy: { name: 'Helpful Member' },
        referralProfileUrl: '/business-referrals/acme-plumbing',
      }),
    ]);
  });

  it('does not query registered profiles for an unclaimed-only search', async () => {
    const serviceService = {
      findBusinessOwnerDiscoveryCards: jest.fn(),
    };
    const businessReferralService = {
      findPublicReferralDiscoveryCards: jest.fn().mockResolvedValue([]),
    };
    const service = new BusinessDiscoveryService(
      serviceService as any,
      businessReferralService as any,
    );

    const result = await service.search({
      claimStatus: 'unclaimed',
      page: 1,
      limit: 10,
    });

    expect(
      serviceService.findBusinessOwnerDiscoveryCards,
    ).not.toHaveBeenCalled();
    expect(result).toEqual({
      meta: { page: 1, limit: 10, total: 0 },
      data: [],
    });
  });
});
