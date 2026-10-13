# Business Referrals - Phase 1 Requirements and API Contract

Status: Draft for product approval  
Scope: Requirements and API contract only; no implementation  
Backend: NestJS, Mongoose, Cloudinary, Resend

## 1. Objective

Allow an authenticated personal user to recommend a business, publish an
unclaimed public business listing with an initial rating and review, notify the
business, and let the verified business owner claim and manage that listing.

The original referrer attribution and review must survive the claim.

## 2. Core architectural rule

An unclaimed business referral is not a `User` and must not create a fake user
account. It is stored as an independent business referral record. After a
successful claim, it links to a real account that has the `businessOwner` role.

Existing registered business profiles continue to use the current user/business
profile model. The referral record provides a stable public identity and claim
audit trail for referred businesses.

## 3. Actors and permissions

### Visitor

- View published referred-business cards and profiles.
- Search and filter published businesses.
- See whether a referred business is unclaimed, claim pending, or claimed.
- Open the claim flow.
- Cannot submit a referral, submit a claim, or view private claim information.

### Personal user

- All visitor permissions.
- Submit a business referral using the personal profile.
- View referrals submitted by their account.
- View claim progress for their referrals.
- Cannot approve a claim.
- Cannot claim their own referral without ownership verification.

### Business owner

- All public permissions.
- Submit a claim for an unclaimed referral.
- Claim using an existing business-owner profile when the ownership checks pass.
- Manage the business only after the claim is approved.

### Admin

- No admin action is required for referral publication or ownership claims.
- Existing platform-level moderation may hide abusive content, but moderation is
  not part of the normal referral or claim lifecycle.

## 4. Referral form requirements

### Required fields

- `businessName`: trimmed string, 2-150 characters.
- `serviceCategoryId`: approved, active service-category ID.
- `state`: valid selected state.
- `city`: valid city for the selected state when location data is available.
- `image`: one image, maximum 5 MB.
- `rating`: integer from 1 through 5.
- `review`: trimmed string, 10-1500 characters.

### Required contact field

- `businessEmail`: normalized lowercase email with valid email syntax.

### Optional contact field

- `businessPhone`: normalized telephone value.

Business email is required. Business phone can be omitted.

### Server-controlled fields

- Referrer identity and display snapshot.
- Slug and normalized business name.
- Listing and claim statuses.
- Image URL and Cloudinary public ID.
- Email-delivery state.
- Created and updated timestamps.

The server must never accept referrer ID, claim status, claimed owner ID, or
approval information from a normal client.

## 5. Lifecycle

### Listing statuses

- `published`: publicly searchable and viewable.
- `hidden`: retained but excluded from public results.
- `archived`: no longer active or claimable.

### Claim statuses

- `unclaimed`: no active claim exists.
- `claimed`: ownership has been approved and linked.

### Email-delivery statuses

- `pending`: queued or ready to send.
- `sent`: accepted by the email provider.
- `failed`: the latest attempt failed and may be retried.

### Main transition

1. Personal user submits a valid referral.
2. Duplicate checks run before creation.
3. The image is uploaded and the referral is persisted.
4. The listing becomes `published` and `unclaimed`; no admin approval is needed.
5. A notification and secure claim link are sent to the business email.
6. A claimant authenticates or creates an account and submits business details.
7. The authenticated claimant must verify the same email stored on the referral.
8. A matching verified-email claim is automatically approved without admin action.
9. Approval provisions or attaches the business-owner profile.
10. The referral becomes `claimed`, links to the owner, and preserves the
    original attribution and review.

Only one owner may be linked to a referral. If the stored business email is
invalid, unreachable, or does not belong to the claimant, the listing remains
public but `unclaimed` and unverified.

## 6. Publication and privacy rules

Default recommendation:

- A valid referral is published immediately.
- Business email is returned by public referral APIs from initial publication.
- Business phone is returned publicly when the referrer supplied it.
- Public responses expose business name, category, city, state, image, rating,
  review, referrer public identity, timestamps, and claim state.
- The submitting referrer may see notification state.
- After claim, only contact information confirmed by the business owner is public.

## 7. Duplicate policy

Creation must compare the new referral against both existing registered
business profiles and existing referral records.

### Strong duplicate indicators

- Same normalized business email.
- Same normalized business phone when a phone was supplied.
- Same normalized name plus same city and state.

### Result

- A strong match returns HTTP `409 Conflict` and a safe public summary of the
  existing listing.
- No second referral is created.
- A weaker match may be created and records its duplicate-candidate signal for
  audit and future automated checks; it does not require admin action.
- Claim approval must perform the duplicate check again to avoid race conditions.

## 8. Claim verification rules

- Claim links use cryptographically random opaque tokens.
- Only a token hash is stored.
- A token expires after 72 hours by default.
- A token is single-use and is revoked when replaced.
- Token validation alone does not bypass authentication.
- A claimant must authenticate or register before final submission.
- Automatic approval requires the claimant to verify the same business email
  stored on the referral.
- Claims using another email are not approved and have no admin override.
- An invalid or unreachable referral email leaves the profile unclaimed and
  unverified.
- Claim actions are recorded in an audit trail.

## 9. API response convention

All endpoints use the existing response envelope:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Human-readable result",
  "meta": null,
  "data": {}
}
```

Paginated endpoints use:

```json
{
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

Public responses must be mapped response objects rather than raw Mongoose
documents.

## 10. Referral endpoints

### Create referral

`POST /api/v1/business-referrals`

- Authentication: personal `user` role.
- Content type: `multipart/form-data`.
- Fields: `businessName`, `serviceCategoryId`, `state`, `city`,
  `businessEmail`, optional `businessPhone`, `rating`, `review`, and `image`.
- Success: HTTP `201`.
- Returns: public referral profile plus the submitting user's private delivery
  status.

### Correct an unclaimed referral email

`PATCH /api/v1/business-referrals/:id/contact-email`

- Authentication: the original referrer.
- Allowed only while the referral is unclaimed.
- Accepts a replacement valid email and records the correction in the audit log.
- Revokes existing claim tokens and sends a new claim notification.
- This endpoint is included as the proposed self-service recovery path for a
  mistyped or bounced email and requires final product confirmation.

### List public referrals

`GET /api/v1/business-referrals`

- Authentication: public.
- Filters: `searchTerm`, `serviceCategoryId`, `category`, `state`, `city`,
  `claimStatus`, `minimumRating`.
- Pagination: `page`, `limit`.
- Sorting allowlist: `createdAt`, `rating`, `businessName`.
- Only `published` records are returned.

### Get public referral profile

`GET /api/v1/business-referrals/:slug`

- Authentication: public.
- Returns a stable profile response for both unclaimed and claimed referrals.
- A claimed response includes the canonical owner-managed profile URL.

### List my referrals

`GET /api/v1/business-referrals/mine`

- Authentication: personal `user` role.
- Filters: `claimStatus`, `notificationStatus`, `searchTerm`.
- Pagination supported.

### Resend owner notification

`POST /api/v1/business-referrals/:id/notifications/resend`

- Authentication: submitting personal user.
- Rate limited.
- Generates a new claim token and revokes the previous token.

## 11. Claim endpoints

### Inspect claim link

`GET /api/v1/business-referrals/claims/verify?token=...`

- Authentication: public.
- Returns only token validity, expiry state, referral ID, business name, and the
  required next action.
- Does not return private contact information.

### Submit a claim

`POST /api/v1/business-referrals/:id/claims`

- Authentication: `user` or `businessOwner`.
- Accepts the full business-profile fields needed by the existing business
  registration flow.
- Accepts the claim token when available.
- Success: HTTP `201` with `claimed` when email verification succeeds.
- A non-matching or unverified email receives a verification error and does not
  create an approved ownership link.
- Repeated submission by the same claimant must be idempotent.

Claim approval is automatic and idempotent after successful matching-email
verification. There are no admin claim approval or rejection endpoints.

## 13. Unified business discovery contract

The preferred public endpoint is:

`GET /api/v1/businesses/search`

Filters:

- `searchTerm`
- `service`
- `serviceCategoryId`
- `category`
- `state`
- `city`
- `location`
- `minimumRating`
- `listingType`: `all`, `registered`, or `referred`
- `claimStatus`
- `page`, `limit`, `sortBy`, `sortOrder`

Every result uses a common business-card shape:

- `listingId`
- `listingType`
- `businessOwnerId` when claimed/registered
- `businessName`
- `profileUrl`
- `image`
- `category`
- `city`, `state`, and public location fields
- `rating`
- `totalReviews`
- `claimStatus`
- `isClaimable`
- `referredBy` when applicable
- `createdAt`

The existing business-owner search endpoint remains available during migration
and delegates to the shared discovery service.

## 14. Error contract

Expected status codes:

- `400 Bad Request`: invalid field, invalid state transition, invalid image.
- `401 Unauthorized`: missing or invalid authentication.
- `403 Forbidden`: role or ownership restriction.
- `404 Not Found`: referral, claim, category, or token target not found.
- `409 Conflict`: duplicate referral, active competing claim, already claimed,
  or incompatible existing business profile.
- `410 Gone`: expired or consumed claim token.
- `413 Payload Too Large`: image exceeds 5 MB.
- `429 Too Many Requests`: notification resend or claim abuse limit.

Errors must not reveal whether a private email belongs to an account.

## 15. Review continuity

- The initial rating and review are immutable system inputs to referral creation.
- While unclaimed, they are returned from the referral record.
- On approval, the review is connected to the standard review collection using
  a unique `sourceReferralId`.
- The original referrer, rating, text, and creation date are preserved.
- Claim finalization is idempotent and cannot create the review twice.
- After conversion, normal review update/delete permissions apply to the
  original referrer.

## 16. Deletion and retention

- Deleting a referrer's personal profile does not automatically delete a useful
  business listing.
- Public attribution becomes `Community member` after referrer deletion.
- Private referrer linkage is removed or anonymized according to account
  deletion policy.
- Deleting a claimed owner-managed business profile permanently deletes its
  linked referral profile and removes it from public results.
- The referral snapshot, referrer attribution, rating, review, and referral
  image are deleted with the claimed business profile.
- The referral image is also removed from Cloudinary when it is not referenced
  by another retained record.
- Claim audit data is retained only to the minimum extent required by the
  platform's security and legal retention policy and is never public.
- Claim audit records are retained for fraud prevention and dispute handling,
  subject to the platform retention policy.
- Cloudinary images are deleted only when the referral itself is permanently
  removed and no retained record references the asset.

## 17. Non-functional requirements

- DTO whitelist validation on all write endpoints.
- Allowlisted sort fields; clients cannot sort by arbitrary document paths.
- Escaped search expressions.
- Database indexes for public queries and uniqueness rules.
- Idempotent claim approval and review conversion.
- Rate limiting for referral creation, claim attempts, token validation, and
  notification resend.
- No raw token, password, or claim evidence in logs.
- Email failure must not roll back a successfully stored referral.
- Uploaded files must be cleaned up after failed persistence.
- All public and protected endpoints documented in Swagger.

## 18. Out of scope for the first production version

- Referral rewards, points, commissions, or payouts.
- Bulk referral import.
- SMS claim verification.
- Multiple owners managing one business.
- Multiple separately managed business locations under one account.
- Automated government/business-registry verification.

These can be added later without changing the initial referral lifecycle.

## 19. Confirmed product decisions

1. Valid referrals publish immediately without admin approval.
2. Business email is required and public from initial publication. Business
   phone is optional and public when supplied.
3. Matching verified-email claims are automatically approved.
4. The claim system has no admin approval or rejection dependency. An invalid,
   unreachable, mismatched, or unverified email leaves the business unclaimed
   and unverified.
5. Claim links expire after 72 hours.
6. Strong duplicates are blocked with HTTP 409 rather than creating another
   referral or review.
7. A deleted referrer's public attribution becomes `Community member`.
8. Deleting a claimed owner-managed business profile permanently deletes its
   linked referral profile and all public referral data.
9. Rewards and referral payments are not part of this feature.

One lifecycle detail remains to confirm: whether the original referrer may
correct a mistyped or bounced business email while the referral remains
unclaimed. This is the only self-service recovery route proposed when no admin
participates.
