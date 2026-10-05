# Business Referrals — Frontend Integration Guide

This guide is the implementation contract for the Business Referrals feature.
It covers the referral form, public discovery, referral detail page, owner
claim flow, referrer dashboard, and email correction flow.

Base API URL:

```text
${API_BASE_URL}/api/v1
```

Examples below omit the base URL and show paths beginning with `/`.

## 1. API envelope and authentication

Every successful endpoint uses this shape:

```ts
type ApiSuccess<T> = {
  statusCode: number;
  success: true;
  message: string;
  meta?: { page: number; limit: number; total: number };
  data: T;
};
```

Errors use this shape:

```ts
type ApiError = {
  statusCode: number;
  success: false;
  message: string;
  errorSources: Array<{ path: string | number; message: string }>;
};
```

For an authenticated request, send the active-profile access token:

```http
Authorization: Bearer <access-token>
```

Important role rules:

- Creating, viewing, resending, or correcting _your_ referrals requires an
  active `user` (personal) profile.
- Claiming accepts an active `user` or `businessOwner` profile.
- A user with both profiles must switch to the required active profile before
  calling a role-protected endpoint.
- Never decide permissions from UI state alone; always handle backend `401` and
  `403` responses.

## 2. Pages and routes to build

Build these frontend screens/routes:

| Screen                      | Suggested frontend route              | Main backend endpoint                   |
| --------------------------- | ------------------------------------- | --------------------------------------- |
| Refer a business modal/page | `/dashboard/referrals/new`            | `POST /business-referrals`              |
| My referrals dashboard      | `/dashboard/referrals`                | `GET /business-referrals/mine`          |
| Public referral profile     | `/business-referrals/:slug`           | `GET /business-referrals/:slug`         |
| Claim landing page          | `/business-referrals/claim?token=...` | `GET /business-referrals/claims/verify` |
| Claim business form         | same claim route after verification   | `POST /business-referrals/:id/claims`   |
| Business search/results     | `/businesses`                         | `GET /businesses/search`                |

The email claim link already targets:

```text
/business-referrals/claim?token=<opaque-token>
```

Keep that route exactly, including preservation of the `token` query string.

## 3. Referral form

### Who may see it

Show the **Refer a Business** button only when the active profile is `user`.
If the visitor is logged out, take them to login and return them to the form.
If the visitor has an active `businessOwner` profile, ask them to switch to
their personal profile first.

### Supporting selector APIs

Use these APIs for form selectors:

```http
GET /service-categories/public?page=1&limit=100
GET /locations/states?countryCode=US
GET /locations/states/:stateIdentifier/cities?countryName=United%20States&limit=100
```

Only allow selection of a category returned by the public categories endpoint.
Keep the selected category's `_id`/`id` as `serviceCategoryId`. Submit the
state and city names returned by the location API.

### Create referral request

```http
POST /business-referrals
Content-Type: multipart/form-data
Authorization: Bearer <personal-user-token>
```

Use `FormData`. Do not manually set the `Content-Type` header; the browser must
set the multipart boundary.

| FormData key        | Required | Rules                         |
| ------------------- | -------- | ----------------------------- |
| `businessName`      | Yes      | 2–150 characters              |
| `serviceCategoryId` | Yes      | Selected approved category ID |
| `state`             | Yes      | Maximum 100 characters        |
| `city`              | Yes      | Maximum 100 characters        |
| `businessEmail`     | Yes      | Valid email address           |
| `businessPhone`     | No       | Maximum 30 characters         |
| `image`             | Yes      | One image, maximum 5 MB       |
| `rating`            | Yes      | Integer from 1 to 5           |
| `review`            | Yes      | 10–1500 characters            |

Example:

```ts
const body = new FormData();
body.append('businessName', values.businessName.trim());
body.append('serviceCategoryId', values.serviceCategoryId);
body.append('state', values.state);
body.append('city', values.city);
body.append('businessEmail', values.businessEmail.trim().toLowerCase());
if (values.businessPhone?.trim())
  body.append('businessPhone', values.businessPhone);
body.append('rating', String(values.rating));
body.append('review', values.review.trim());
body.append('image', values.imageFile);

await api.post('/business-referrals', body, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

Frontend validation improves usability, but the backend remains authoritative.
Before submission, validate image MIME type starts with `image/` and size is no
more than `5 * 1024 * 1024` bytes.

### Create success behavior

The listing publishes immediately. Do not show an admin-review or pending
approval state.

Show a success notice such as:

> Your referral is now public. We sent the business a secure claim link.

Store or display these private dashboard fields from the response:

- `emailDeliveryStatus`: `pending`, `sent`, or `failed`
- `emailDeliveryAttempts`
- `emailLastAttemptAt`

Never show delivery state to public visitors.

### Create errors to handle

| Status | UI behavior                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------- |
| `400`  | Highlight invalid field(s) from `errorSources`.                                                   |
| `401`  | Send user to login.                                                                               |
| `403`  | Tell user to switch to their personal profile.                                                    |
| `409`  | Show that this business already has a referral or registered profile; do not retry automatically. |
| `413`  | Show “Image must be 5 MB or smaller.”                                                             |

## 4. Public business discovery

Use the unified endpoint for new business search screens:

```http
GET /businesses/search
```

Supported query parameters:

| Parameter           | Values / notes                                          |
| ------------------- | ------------------------------------------------------- |
| `searchTerm`        | Business/category/location text, maximum 150 characters |
| `service`           | Service title or keyword, maximum 150 characters        |
| `serviceCategoryId` | Category Mongo ID                                       |
| `category`          | Exact category name                                     |
| `state`, `city`     | Exact location filters                                  |
| `location`          | Flexible location text                                  |
| `minimumRating`     | Number from 1 to 5                                      |
| `listingType`       | `all` (default), `registered`, or `referred`            |
| `claimStatus`       | `unclaimed` or `claimed`                                |
| `sortBy`            | `createdAt` (default), `rating`, or `businessName`      |
| `sortOrder`         | `desc` (default) or `asc`                               |
| `page`, `limit`     | Page starts at 1; limit is 1–100                        |

Example:

```http
GET /businesses/search?listingType=referred&claimStatus=unclaimed&serviceCategoryId=6871aa22bb33cc44dd55ee66&state=Texas&city=Austin&sortBy=rating&sortOrder=desc&page=1&limit=20
```

### Shared business-card model

Every result has the common fields below. Some fields are intentionally
optional because registered and referred businesses have different sources.

```ts
type BusinessCard = {
  listingId: string;
  listingType: 'registered' | 'referred';
  businessOwnerId?: string;
  businessName: string;
  profileUrl: string;
  image?: string;
  category?: string;
  serviceCategoryId?: string;
  city?: string;
  state?: string;
  rating: number;
  totalReviews: number;
  claimStatus: 'unclaimed' | 'claimed';
  isClaimable: boolean;
  referredBy?: { id?: string; name: string; avatar?: string };
  referralProfileUrl?: string;
  createdAt?: string;
};
```

Card UI rules:

- `listingType === 'referred' && isClaimable === true`: show an **Unclaimed**
  badge and a **Claim this business** CTA that opens the claim instructions.
- `listingType === 'referred' && claimStatus === 'claimed'`: show **Verified
  owner**. The stable referral `profileUrl` remains valid.
- `listingType === 'registered'`: do not show a claim CTA.
- When `referredBy` exists, show “Referred by {name}”. It can be
  `Community member`; do not try to resolve that text to a user profile.
- In `listingType=all`, a claimed referral is merged into its registered owner
  card to avoid duplicate results. If present, `referralProfileUrl` links to
  the original referral page.

Use `meta.total` for pagination. Reset the page to `1` whenever a search or
filter changes.

## 5. Public referral profile

```http
GET /business-referrals/:slug
```

This page is public. It returns the original referral information:

- business name, category, state/city, image, rating, and review
- public business email and optional phone
- `referredBy`
- `claimStatus`, `isVerified`, and `isClaimable`

For an unclaimed listing, render the original referral as the source of truth.

For a claimed listing, preserve the original referral review and attribution,
but render `ownerManagedProfile` as the current business information. Also use
`canonicalProfileUrl` as the CTA to the owner-managed business profile.

Recommended claimed-page copy:

> This business was referred by {referredBy.name} and is now managed by its
> verified owner.

Do not offer a public edit action on any referral page.

## 6. Claim flow

### Step 1: read and validate the token

On `/business-referrals/claim?token=...`, read the query parameter and call:

```http
GET /business-referrals/claims/verify?token=<token>
```

This endpoint is public. A valid response includes:

```ts
{
  valid: true;
  expiresAt: string;
  referralId: string;
  businessName: string;
  businessEmail: string;
  requiredAction: 'authenticate_or_register';
}
```

Keep the token and `referralId` only in memory or session storage for the
current claim flow. Do not put the raw token in analytics, logs, error reports,
or a publicly shared URL other than the original email link.

If validation returns `404` or `410`, show a terminal invalid/expired-link
screen. For `410`, explain that the referrer can send a new link from their
dashboard.

### Step 2: authenticate with the matching email

The authenticated account must satisfy both conditions:

1. Its account email is verified.
2. Its account email exactly matches `businessEmail` from token validation.

If the owner does not have an account, use the normal personal-user
registration/login flow, with the same business email. After registration,
they must verify that account email before submitting the claim.

Do not offer a different-email claim path. It is intentionally rejected and
there is no admin approval fallback.

### Step 3: submit business information

```http
POST /business-referrals/:referralId/claims
Content-Type: application/json
Authorization: Bearer <user-or-business-owner-token>
```

Request body:

```ts
type ClaimBusinessBody = {
  claimToken: string; // token from the email link
  businessEmail: string; // must exactly match the referral/account email
  ownerName: string; // required, maximum 150 characters
  businessWebsiteUrl?: string; // valid absolute URL
  address?: string; // maximum 250 characters
  serviceArea?: string; // maximum 250 characters
  bio?: string; // maximum 1500 characters
  phoneNumber?: string; // maximum 30 characters
  postcode?: string; // maximum 20 characters
  country?: string; // maximum 100 characters
};
```

The referral supplies the business name, category, state, city, image, rating,
and original review. Do not ask the claimant to re-enter those values.

### Claim success

Success returns:

```ts
{
  referralId: string;
  claimStatus: 'claimed';
  businessOwnerId: string;
  username?: string;
  profileUrl: string;
  activeRole: 'businessOwner';
  nextAction: 'switch_profile';
  idempotent: boolean;
}
```

When `nextAction === 'switch_profile'`, call:

```http
POST /auth/switch-profile
Authorization: Bearer <current-token>
Content-Type: application/json

{ "targetRole": "businessOwner" }
```

Replace the stored session/token using the response from that endpoint, then
redirect to `profileUrl` or the business dashboard. If `idempotent` is `true`,
show the same success destination; do not show an error.

### Claim errors

| Status | Meaning and UI action                                                                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `401`  | Ask the owner to log in. Preserve claim token/referral ID for post-login continuation.                                                                            |
| `403`  | Account email is unverified or does not match. Explain that the owner must verify and use the referral email.                                                     |
| `404`  | Invalid referral or token. Show terminal error.                                                                                                                   |
| `409`  | Referral already claimed, another claim is in progress, or this account already owns a claimed referral. Refresh public profile and show the correct destination. |
| `410`  | Token expired or already used. If already used, show the owner business destination when available; otherwise ask referrer to resend.                             |

## 7. My referrals dashboard

```http
GET /business-referrals/mine?page=1&limit=10
Authorization: Bearer <personal-user-token>
```

Available filters are the public referral filters plus:

```text
claimStatus=unclaimed|claimed
emailDeliveryStatus=pending|sent|failed
searchTerm, serviceCategoryId, category, state, city, minimumRating,
sortBy=createdAt|rating|businessName, sortOrder=asc|desc, page, limit
```

Dashboard actions:

### Resend claim email

```http
POST /business-referrals/:id/notifications/resend
Authorization: Bearer <personal-user-token>
```

The endpoint has a 60-second cooldown. Disable the resend button immediately
after a request and use `emailLastAttemptAt` to display the countdown. On
`429`, keep the button disabled until the cooldown ends.

### Correct a mistyped business email

Only show this action when `claimStatus === 'unclaimed'`.

```http
PATCH /business-referrals/:id/contact-email
Authorization: Bearer <personal-user-token>
Content-Type: application/json

{ "businessEmail": "corrected@example.com" }
```

This action:

- is available only to the original referrer;
- is available only while the listing is published and unclaimed;
- rejects the existing email value;
- runs duplicate checks again;
- invalidates the previous claim token and sends a new 72-hour link.

After success, replace the row/card with the returned referral object and show
the returned `emailDeliveryStatus`. Do not say that the new address is
verified; delivery state means only that the email provider accepted or failed
the send.

## 8. Important lifecycle rules for UI

- Referrals publish immediately. There is no normal admin approval state.
- `unclaimed` means a public listing exists but has no verified owner.
- `claimed` means the verified matching-email owner has taken ownership.
- The original rating and review remain visible after claim.
- The original referrer can become `Community member` after account deletion.
  Render that label literally and do not show a broken profile link.
- If a claimed business owner deletes the business profile, its linked referral
  profile is permanently removed. Handle a later `404` by returning users to
  search results.
- Never build a payment, reward, referral-credit, or admin-approval UI for
  this feature.

## 9. Recommended frontend state model

Keep server status distinct from UI loading state:

```ts
type ReferralUiState = {
  submitState: 'idle' | 'submitting' | 'success' | 'error';
  claimTokenState: 'checking' | 'valid' | 'invalid' | 'expired';
  claimSubmitState: 'idle' | 'submitting' | 'success' | 'error';
  resendState: 'idle' | 'sending' | 'cooldown' | 'error';
};
```

Do not infer a claim state from email delivery status. For example, a referral
with `emailDeliveryStatus: 'failed'` is still public and may remain
`claimStatus: 'unclaimed'`.

## 10. Frontend completion checklist

- [ ] Refer form uses `multipart/form-data` and requires image/rating/review.
- [ ] Category and location dropdowns use the public API data.
- [ ] All authenticated referral actions send the correct active-profile token.
- [ ] Public search uses `/businesses/search` for new screens.
- [ ] Referred cards show unclaimed/verified owner state correctly.
- [ ] Referral detail page handles both unclaimed and claimed response shapes.
- [ ] Claim page verifies token before showing the claim form.
- [ ] Claim form requires matching, verified account email and never offers an admin fallback.
- [ ] My Referrals hides private delivery details from public components.
- [ ] Resend handles the 60-second cooldown and email correction replaces the old link.
- [ ] `401`, `403`, `409`, `410`, and `413` are shown with clear user-facing messages.
