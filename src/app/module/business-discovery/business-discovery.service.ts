import { Injectable } from '@nestjs/common';
import { BusinessReferralService } from '../business-referral/business-referral.service';
import { ServiceService } from '../service/service.service';
import { SearchBusinessesDto } from './dto/search-businesses.dto';

type BusinessCard = Record<string, any> & {
  listingId: string;
  listingType: 'registered' | 'referred';
  rating: number;
  createdAt?: Date | string;
};

@Injectable()
export class BusinessDiscoveryService {
  constructor(
    private readonly serviceService: ServiceService,
    private readonly businessReferralService: BusinessReferralService,
  ) {}

  private normalizeRegisteredCard(card: Record<string, any>): BusinessCard {
    return {
      ...card,
      listingId: String(card.listingId ?? card.businessOwnerId),
      listingType: 'registered',
      rating: Number(card.rating ?? 0),
      claimStatus: 'claimed',
      isClaimable: false,
    };
  }

  private compareCards(
    left: BusinessCard,
    right: BusinessCard,
    sortBy: 'createdAt' | 'rating' | 'businessName',
    sortOrder: 'asc' | 'desc',
  ) {
    const direction = sortOrder === 'asc' ? 1 : -1;
    const leftValue = left[sortBy];
    const rightValue = right[sortBy];

    if (leftValue === rightValue) {
      return `${left.listingType}:${left.listingId}`.localeCompare(
        `${right.listingType}:${right.listingId}`,
      );
    }
    if (leftValue === undefined || leftValue === null) return 1;
    if (rightValue === undefined || rightValue === null) return -1;

    if (sortBy === 'createdAt') {
      return (
        (new Date(leftValue).getTime() - new Date(rightValue).getTime()) *
        direction
      );
    }
    if (sortBy === 'rating') {
      return (Number(leftValue) - Number(rightValue)) * direction;
    }
    return String(leftValue).localeCompare(String(rightValue)) * direction;
  }

  async search(query: SearchBusinessesDto) {
    const listingType = query.listingType ?? 'all';
    const includeRegistered =
      listingType !== 'referred' && query.claimStatus !== 'unclaimed';
    const includeReferrals = listingType !== 'registered';

    const [registeredCards, referralCards] = await Promise.all([
      includeRegistered
        ? this.serviceService.findBusinessOwnerDiscoveryCards({
            searchTerm: query.searchTerm,
            service: query.service,
            serviceCategoryId: query.serviceCategoryId,
            category: query.category,
            state: query.state,
            city: query.city,
            location: query.location,
            minimumRating: query.minimumRating,
          })
        : Promise.resolve([]),
      includeReferrals
        ? this.businessReferralService.findPublicReferralDiscoveryCards(query)
        : Promise.resolve([]),
    ]);

    const registered = registeredCards.map((card) =>
      this.normalizeRegisteredCard(card),
    );
    let referrals = referralCards as BusinessCard[];

    if (listingType === 'all') {
      const registeredOwnerIds = new Set(
        registered.map((card) => String(card.businessOwnerId)),
      );
      const referralByOwnerId = new Map(
        referrals
          .filter(
            (referral) =>
              referral.claimStatus === 'claimed' && referral.businessOwnerId,
          )
          .map((referral) => [String(referral.businessOwnerId), referral]),
      );

      for (const card of registered) {
        const referral = referralByOwnerId.get(String(card.businessOwnerId));
        if (referral) {
          card.referredBy = referral.referredBy;
          card.referralProfileUrl = referral.profileUrl;
        }
      }

      referrals = referrals.filter(
        (referral) =>
          !referral.businessOwnerId ||
          !registeredOwnerIds.has(String(referral.businessOwnerId)),
      );
    }

    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const cards = [...registered, ...referrals].sort((left, right) =>
      this.compareCards(left, right, sortBy, sortOrder),
    );
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const start = (page - 1) * limit;

    return {
      meta: { page, limit, total: cards.length },
      data: cards.slice(start, start + limit),
    };
  }
}
