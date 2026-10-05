export const BUSINESS_REFERRAL_LISTING_STATUSES = [
  'published',
  'hidden',
  'archived',
] as const;

export type BusinessReferralListingStatus =
  (typeof BUSINESS_REFERRAL_LISTING_STATUSES)[number];

export const BUSINESS_REFERRAL_CLAIM_STATUSES = [
  'unclaimed',
  'claimed',
] as const;

export type BusinessReferralClaimStatus =
  (typeof BUSINESS_REFERRAL_CLAIM_STATUSES)[number];

export const BUSINESS_CLAIM_STATUSES = [
  'pending_verification',
  'approved',
  'expired',
] as const;

export type BusinessClaimStatus = (typeof BUSINESS_CLAIM_STATUSES)[number];

export const REFERRAL_EMAIL_DELIVERY_STATUSES = [
  'pending',
  'sent',
  'failed',
] as const;

export type ReferralEmailDeliveryStatus =
  (typeof REFERRAL_EMAIL_DELIVERY_STATUSES)[number];

export const BUSINESS_REFERRAL_SORT_FIELDS = [
  'createdAt',
  'rating',
  'businessName',
] as const;

export type BusinessReferralSortField =
  (typeof BUSINESS_REFERRAL_SORT_FIELDS)[number];

export const BUSINESS_REFERRAL_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
export const BUSINESS_REFERRAL_CLAIM_TOKEN_TTL_HOURS = 72;
export const BUSINESS_REFERRAL_EMAIL_RESEND_COOLDOWN_MS = 60 * 1000;
