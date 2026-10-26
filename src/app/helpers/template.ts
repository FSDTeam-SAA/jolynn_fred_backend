type NotificationEmailParams = {
  heading: string;
  subheading?: string;
  greetingName?: string;
  introText?: string;
  showHeading?: boolean;
  headerAppearance?: 'brand' | 'plain';
  details?: { label: string; value: string }[];
  noteTitle?: string;
  noteText?: string;
  footerText?: string;
  footerLinksHtml?: string;
  actionUrl?: string;
  actionLabel?: string;
  contentAfterHeader?: string;
  contentBeforeFooter?: string;
  theme?: NotificationEmailTheme;
};

type NotificationEmailTheme = {
  primary: string;
  secondary: string;
  pale: string;
  panel: string;
  ink: string;
  muted: string;
  border: string;
  headerText: string;
};

type PasswordResetTemplateParams = {
  otp: string | number;
  expiryMinutes?: number;
};

type RegistrationConfirmationTemplateParams = {
  displayName: string;
  loginUrl: string;
  verificationUrl?: string;
  accountType: 'user' | 'businessOwner';
};

type NewsletterEmailTemplateParams = {
  displayName: string;
  subject: string;
  content: string;
  platformUrl: string;
};

type PaymentSuccessTemplateParams = {
  paymentId: string;
  amount: number;
  currency: string;
  description?: string;
  nameOnCard?: string;
  country?: string;
  zipCode?: string;
  paymentDate: string;
  paymentMethod?: string;
};

export const SIDEQUOTE_EMAIL_LOGO_CID = 'sidequote-logo';

const sideQuoteEmailLogoHtml = `
                <img src="cid:${SIDEQUOTE_EMAIL_LOGO_CID}" width="64" height="64" alt="SideQuote" style="display:block;width:64px;height:64px;margin:0 auto 18px;border:0;border-radius:50%;outline:none;text-decoration:none;" />`;

const brand = {
  name: 'Jolynn',
  primary: '#626d5a',
  primaryDark: '#4f5949',
  cream: '#f5f0e8',
  panel: '#fbfaf7',
  gold: '#b48a45',
  ink: '#272a25',
  muted: '#6d7468',
  border: '#e7dfd3',
};

const sideQuoteBrand = {
  name: 'SideQuote',
  primary: '#30377e',
  secondary: '#078bd6',
  pale: '#e1f1f2',
  panel: '#ffffff',
  ink: '#171b4b',
  muted: '#5f6b7a',
  border: '#dce7f2',
};

const defaultNotificationTheme: NotificationEmailTheme = {
  ...sideQuoteBrand,
  headerText: '#eaf7ff',
};

const referralEmailThemes: Record<
  'customer' | 'admin',
  NotificationEmailTheme
> = {
  customer: {
    primary: '#078bd6',
    secondary: '#55b8e8',
    pale: '#edf8fe',
    panel: '#ffffff',
    ink: '#17324d',
    muted: '#5f6b7a',
    border: '#cfe8f6',
    headerText: '#f3fbff',
  },
  admin: {
    primary: '#171b4b',
    secondary: '#30377e',
    pale: '#eef0f8',
    panel: '#ffffff',
    ink: '#171b4b',
    muted: '#5f667d',
    border: '#d7daea',
    headerText: '#f1f2ff',
  },
};

const sideQuoteLegalLinksHtml = `
  <p style="margin:10px 0 0;color:${sideQuoteBrand.muted};font-size:12px;line-height:1.7;">
    <a href="https://sidequote.cloud/privacy-policy" target="_blank" style="color:${sideQuoteBrand.secondary};text-decoration:underline;">Privacy Policy</a>
    <span style="color:${sideQuoteBrand.muted};"> | </span>
    <a href="https://sidequote.cloud/terms-and-condition" target="_blank" style="color:${sideQuoteBrand.secondary};text-decoration:underline;">Terms and Conditions</a>
  </p>`;

const sideQuoteReferralLinksHtml = `
  <p style="margin:10px 0 0;color:${sideQuoteBrand.muted};font-size:12px;line-height:1.7;">
    <a href="https://sidequote.cloud/about-us" target="_blank" style="color:${sideQuoteBrand.secondary};text-decoration:underline;">About Us</a>
    <span style="color:${sideQuoteBrand.muted};"> | </span>
    <a href="https://sidequote.cloud/#faq" target="_blank" style="color:${sideQuoteBrand.secondary};text-decoration:underline;">FAQ</a>
  </p>`;

const jolynnLegalLinksHtml = `
  <p style="margin:10px 0 0;color:${brand.muted};font-size:12px;line-height:1.7;">
    <a href="https://sidequote.cloud/privacy-policy" target="_blank" style="color:${brand.gold};text-decoration:underline;">Privacy Policy</a>
    <span style="color:${brand.muted};"> | </span>
    <a href="https://sidequote.cloud/terms-and-condition" target="_blank" style="color:${brand.gold};text-decoration:underline;">Terms and Conditions</a>
  </p>`;

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character]!,
  );

export const createRegistrationConfirmationEmailTemplate = ({
  displayName,
  loginUrl,
  verificationUrl,
  accountType,
}: RegistrationConfirmationTemplateParams) => {
  const safeDisplayName = escapeHtml(displayName || 'there');
  const safeLoginUrl = escapeHtml(loginUrl);
  const safeVerificationUrl = verificationUrl
    ? escapeHtml(verificationUrl)
    : undefined;
  const actionUrl = safeVerificationUrl || safeLoginUrl;
  const actionLabel = verificationUrl
    ? 'Confirm your email &rarr;'
    : 'Log in to your account &rarr;';
  const accountLabel =
    accountType === 'businessOwner' ? 'Business account' : 'User account';

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:${sideQuoteBrand.pale};font-family:Arial,Helvetica,sans-serif;color:${sideQuoteBrand.ink};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:${sideQuoteBrand.pale};margin:0;padding:36px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:${sideQuoteBrand.panel};border:1px solid ${sideQuoteBrand.border};border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(30,48,93,0.14);">
            <tr>
              <td style="background:${sideQuoteBrand.primary};background-image:linear-gradient(135deg,${sideQuoteBrand.primary} 0%,${sideQuoteBrand.secondary} 100%);padding:38px 34px 34px;text-align:center;">
                ${sideQuoteEmailLogoHtml}
                <h1 style="margin:0;color:#ffffff;font-size:30px;line-height:1.25;font-weight:800;">Welcome to ${sideQuoteBrand.name}</h1>
                <p style="margin:12px 0 0;color:#eaf7ff;font-size:16px;line-height:1.6;">Your account is ready. Let&rsquo;s get you signed in.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:38px 38px 12px;">
                <p style="margin:0 0 16px;color:${sideQuoteBrand.ink};font-size:17px;line-height:1.7;font-weight:700;">Hello ${safeDisplayName},</p>
                <p style="margin:0;color:${sideQuoteBrand.muted};font-size:15px;line-height:1.8;">
                  Thank you for joining ${sideQuoteBrand.name}. ${verificationUrl ? 'Please confirm your email address before logging in.' : 'Your account is ready. You can now log in to explore services, connect with the community, and manage your profile.'}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:22px 38px 4px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f9fd;border:1px solid ${sideQuoteBrand.border};border-radius:12px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 6px;color:${sideQuoteBrand.muted};font-size:12px;line-height:1.4;text-transform:uppercase;letter-spacing:1.2px;font-weight:700;">Account type</p>
                      <p style="margin:0;color:${sideQuoteBrand.primary};font-size:16px;line-height:1.5;font-weight:800;">${accountLabel}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:30px 38px 34px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" bgcolor="${sideQuoteBrand.primary}" style="border-radius:10px;background:${sideQuoteBrand.primary};background-image:linear-gradient(90deg,${sideQuoteBrand.primary},${sideQuoteBrand.secondary});">
                      <a href="${actionUrl}" target="_blank" style="display:inline-block;padding:15px 30px;color:#ffffff;text-decoration:none;font-size:16px;line-height:1.2;font-weight:800;">${actionLabel}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 6px;color:${sideQuoteBrand.muted};font-size:13px;line-height:1.6;">If the button does not work, copy and paste this link into your browser:</p>
                <p style="margin:0;word-break:break-all;font-size:13px;line-height:1.6;"><a href="${actionUrl}" style="color:${sideQuoteBrand.secondary};text-decoration:underline;">${actionUrl}</a></p>
                ${verificationUrl ? `<p style="margin:14px 0 0;color:${sideQuoteBrand.muted};font-size:13px;line-height:1.6;">This verification link will expire in 24 hours.</p>` : ''}
              </td>
            </tr>

            <tr>
              <td style="background:#f7fbfd;border-top:1px solid ${sideQuoteBrand.border};padding:24px 34px;text-align:center;">
                <p style="margin:0;color:${sideQuoteBrand.muted};font-size:12px;line-height:1.7;">If you did not create this account, please contact our support team.</p>
                ${sideQuoteLegalLinksHtml}
                <p style="margin:8px 0 0;color:${sideQuoteBrand.primary};font-size:13px;line-height:1.7;font-weight:800;">The ${sideQuoteBrand.name} Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const createNewsletterEmailTemplate = ({
  displayName,
  subject,
  content,
  platformUrl,
}: NewsletterEmailTemplateParams) => {
  const safeDisplayName = escapeHtml(displayName || 'SideQuote member');
  const safeSubject = escapeHtml(subject);
  const safeContent = escapeHtml(content).replace(/\r?\n/g, '<br />');
  const safePlatformUrl = escapeHtml(platformUrl);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0;padding:0;background:${sideQuoteBrand.pale};font-family:Arial,Helvetica,sans-serif;color:${sideQuoteBrand.ink};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:${sideQuoteBrand.pale};margin:0;padding:36px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;background:${sideQuoteBrand.panel};border:1px solid ${sideQuoteBrand.border};border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(30,48,93,0.14);">
            <tr>
              <td style="background:${sideQuoteBrand.primary};background-image:linear-gradient(135deg,${sideQuoteBrand.primary} 0%,${sideQuoteBrand.secondary} 100%);padding:34px;text-align:center;">
                ${sideQuoteEmailLogoHtml}
                <p style="margin:0 0 10px;color:#dff4ff;font-size:13px;line-height:1.4;text-transform:uppercase;letter-spacing:1.8px;font-weight:800;">${sideQuoteBrand.name} Newsletter</p>
                <h1 style="margin:0;color:#ffffff;font-size:29px;line-height:1.3;font-weight:800;">${safeSubject}</h1>
              </td>
            </tr>

            <tr>
              <td style="padding:38px 40px 12px;">
                <p style="margin:0 0 18px;color:${sideQuoteBrand.ink};font-size:17px;line-height:1.7;font-weight:700;">Hello ${safeDisplayName},</p>
                <div style="color:${sideQuoteBrand.muted};font-size:15px;line-height:1.85;">${safeContent}</div>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:28px 40px 38px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" bgcolor="${sideQuoteBrand.primary}" style="border-radius:10px;background:${sideQuoteBrand.primary};background-image:linear-gradient(90deg,${sideQuoteBrand.primary},${sideQuoteBrand.secondary});">
                      <a href="${safePlatformUrl}" target="_blank" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:15px;line-height:1.2;font-weight:800;">Visit ${sideQuoteBrand.name} &rarr;</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#f7fbfd;border-top:1px solid ${sideQuoteBrand.border};padding:24px 34px;text-align:center;">
                <p style="margin:0;color:${sideQuoteBrand.muted};font-size:12px;line-height:1.7;">You received this newsletter because you have an active ${sideQuoteBrand.name} account.</p>
                ${sideQuoteLegalLinksHtml}
                <p style="margin:8px 0 0;color:${sideQuoteBrand.primary};font-size:13px;line-height:1.7;font-weight:800;">The ${sideQuoteBrand.name} Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const createForgotPasswordEmailTemplate = ({
  otp,
  expiryMinutes = 10,
}: PasswordResetTemplateParams) => {
  const otpCode = String(otp);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Password Reset</title>
  </head>
  <body style="margin:0;padding:0;background:${sideQuoteBrand.pale};font-family:Arial,Helvetica,sans-serif;color:${sideQuoteBrand.ink};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${sideQuoteBrand.pale};margin:0;padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:${sideQuoteBrand.panel};border:1px solid ${sideQuoteBrand.border};border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(30,48,93,0.14);">
            <tr>
              <td style="background:${sideQuoteBrand.primary};background-image:linear-gradient(135deg,${sideQuoteBrand.primary} 0%,${sideQuoteBrand.secondary} 100%);padding:34px 34px 30px;text-align:center;">
                ${sideQuoteEmailLogoHtml}
                <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.25;font-weight:700;">Reset your password</h1>
                <p style="margin:10px 0 0;color:#dff4ff;font-size:15px;line-height:1.6;">Use the verification code below to continue securely.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:36px 34px 10px;">
                <p style="margin:0 0 16px;color:${sideQuoteBrand.ink};font-size:16px;line-height:1.7;">Hello,</p>
                <p style="margin:0;color:${sideQuoteBrand.muted};font-size:15px;line-height:1.8;">
                  We received a request to reset the password for your ${sideQuoteBrand.name} account. Enter this one-time password in the app to verify your identity.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:26px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid ${sideQuoteBrand.border};border-radius:14px;">
                  <tr>
                    <td align="center" style="padding:28px 20px;">
                      <p style="margin:0 0 12px;color:${sideQuoteBrand.muted};font-size:13px;line-height:1;text-transform:uppercase;letter-spacing:1.6px;font-weight:700;">Your OTP Code</p>
                      <div style="display:inline-block;background:${sideQuoteBrand.pale};border:1px solid ${sideQuoteBrand.border};border-radius:12px;padding:16px 24px;">
                        <span style="font-size:34px;line-height:1;letter-spacing:8px;color:${sideQuoteBrand.primary};font-weight:800;">${otpCode}</span>
                      </div>
                      <p style="margin:16px 0 0;color:${sideQuoteBrand.muted};font-size:14px;line-height:1.6;">This code expires in ${expiryMinutes} minutes.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 34px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f9fd;border-left:4px solid ${sideQuoteBrand.secondary};border-radius:10px;">
                  <tr>
                    <td style="padding:18px 18px;">
                      <p style="margin:0;color:${sideQuoteBrand.ink};font-size:14px;line-height:1.7;font-weight:700;">Didn’t request this?</p>
                      <p style="margin:6px 0 0;color:${sideQuoteBrand.muted};font-size:14px;line-height:1.7;">
                        You can safely ignore this email. Your password will not change unless this code is verified.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#f7fbfd;border-top:1px solid ${sideQuoteBrand.border};padding:22px 34px;text-align:center;">
                <p style="margin:0;color:${sideQuoteBrand.muted};font-size:12px;line-height:1.7;">For your security, never share this code with anyone.</p>
                ${sideQuoteLegalLinksHtml}
                <p style="margin:8px 0 0;color:${sideQuoteBrand.primary};font-size:12px;line-height:1.7;font-weight:700;">${sideQuoteBrand.name} Support Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const createPaymentSuccessEmailTemplate = ({
  paymentId,
  amount,
  currency,
  description,
  nameOnCard,
  country,
  zipCode,
  paymentDate,
  paymentMethod,
}: PaymentSuccessTemplateParams) => {
  const amountLabel = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payment Confirmation</title>
  </head>
  <body style="margin:0;padding:0;background:${brand.cream};font-family:Arial,Helvetica,sans-serif;color:${brand.ink};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${brand.cream};margin:0;padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:${brand.panel};border:1px solid ${brand.border};border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(39,42,37,0.10);">
            <tr>
              <td style="background:${brand.primary};padding:34px 34px 30px;text-align:center;">
                ${sideQuoteEmailLogoHtml}
                <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.25;font-weight:700;">Payment Received</h1>
                <p style="margin:10px 0 0;color:#ece8df;font-size:15px;line-height:1.6;">Thank you for your payment. Your transaction was completed successfully.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:36px 34px 10px;">
                <p style="margin:0 0 16px;color:${brand.ink};font-size:16px;line-height:1.7;">Hello,</p>
                <p style="margin:0;color:${brand.muted};font-size:15px;line-height:1.8;">
                  We have received your payment for ${brand.name}. Below are the details of your successful transaction.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 34px 18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid ${brand.border};border-radius:14px;">
                  <tr>
                    <td style="padding:24px 26px;">
                      <p style="margin:0 0 12px;color:${brand.muted};font-size:14px;line-height:1.8;font-weight:700;">Payment ID</p>
                      <p style="margin:0 0 16px;color:${brand.ink};font-size:16px;line-height:1.7;word-break:break-all;">${paymentId}</p>

                      <p style="margin:0 0 12px;color:${brand.muted};font-size:14px;line-height:1.8;font-weight:700;">Amount</p>
                      <p style="margin:0 0 16px;color:${brand.ink};font-size:16px;line-height:1.7;">${amountLabel}</p>

                      <p style="margin:0 0 12px;color:${brand.muted};font-size:14px;line-height:1.8;font-weight:700;">Date</p>
                      <p style="margin:0 0 16px;color:${brand.ink};font-size:16px;line-height:1.7;">${paymentDate}</p>

                      <p style="margin:0 0 12px;color:${brand.muted};font-size:14px;line-height:1.8;font-weight:700;">Payment Method</p>
                      <p style="margin:0 0 16px;color:${brand.ink};font-size:16px;line-height:1.7;">${paymentMethod ?? 'Card'}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 34px 18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8f6f1;border-left:4px solid ${brand.gold};border-radius:10px;">
                  <tr>
                    <td style="padding:18px 18px;">
                      <p style="margin:0;color:${brand.ink};font-size:14px;line-height:1.7;font-weight:700;">Transaction Details</p>
                      <p style="margin:10px 0 0;color:${brand.muted};font-size:14px;line-height:1.7;">Description: ${description ?? 'Not provided'}</p>
                      <p style="margin:6px 0 0;color:${brand.muted};font-size:14px;line-height:1.7;">Name on card: ${nameOnCard ?? 'N/A'}</p>
                      <p style="margin:6px 0 0;color:${brand.muted};font-size:14px;line-height:1.7;">Country: ${country ?? 'N/A'} • Postal code: ${zipCode ?? 'N/A'}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff;border-top:1px solid ${brand.border};padding:22px 34px;text-align:center;">
                <p style="margin:0;color:${brand.muted};font-size:12px;line-height:1.7;">If you did not authorize this payment, contact our support team immediately.</p>
                ${jolynnLegalLinksHtml}
                <p style="margin:8px 0 0;color:${brand.primary};font-size:12px;line-height:1.7;font-weight:700;">${brand.name} Billing Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};
export const createNotificationEmailTemplate = ({
  heading,
  subheading,
  greetingName,
  introText,
  details = [],
  noteTitle,
  noteText,
  footerText,
  footerLinksHtml = sideQuoteLegalLinksHtml,
  actionUrl,
  actionLabel,
  contentAfterHeader,
  contentBeforeFooter,
  theme = defaultNotificationTheme,
  showHeading = true,
  headerAppearance = 'brand',
}: NotificationEmailParams) => {
  const detailsRows = details
    .map(
      (item) => `
                      <p style="margin:0 0 12px;color:${theme.muted};font-size:14px;line-height:1.8;font-weight:700;">${item.label}</p>
                      <p style="margin:0 0 16px;color:${theme.ink};font-size:16px;line-height:1.7;">${item.value}</p>`,
    )
    .join('');

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${heading}</title>
    <style>
      @media only screen and (max-width:600px) {
        .sq-referral-column { display:block !important; width:100% !important; }
        .sq-referral-images { padding:0 0 18px !important; }
        .sq-referral-details { padding:0 !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${theme.pale};font-family:Arial,Helvetica,sans-serif;color:${theme.ink};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:${theme.pale};margin:0;padding:36px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:${theme.panel};border:1px solid ${theme.border};border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(30,48,93,0.14);">
            <tr>
              <td style="background:${headerAppearance === 'plain' ? theme.panel : theme.primary};background-image:${headerAppearance === 'plain' ? 'none' : `linear-gradient(135deg,${theme.primary} 0%,${theme.secondary} 100%)`};padding:34px 34px 30px;text-align:center;">
                ${sideQuoteEmailLogoHtml}
                ${showHeading ? `<h1 style="margin:0;color:${headerAppearance === 'plain' ? theme.ink : '#ffffff'};font-size:28px;line-height:1.25;font-weight:800;">${heading}</h1>` : ''}
                ${subheading ? `<p style="margin:${showHeading ? '10px' : '0'} 0 0;color:${headerAppearance === 'plain' ? theme.muted : theme.headerText};font-size:15px;line-height:1.6;">${subheading}</p>` : ''}
              </td>
            </tr>

            ${contentAfterHeader ?? ''}

            ${
              greetingName || introText
                ? `<tr>
              <td style="padding:36px 34px 10px;">
                ${greetingName ? `<p style="margin:0 0 16px;color:${theme.ink};font-size:16px;line-height:1.7;font-weight:700;">Hello ${greetingName},</p>` : ''}
                ${introText ? `<p style="margin:0;color:${theme.muted};font-size:15px;line-height:1.8;">${introText}</p>` : ''}
              </td>
            </tr>`
                : ''
            }

            ${
              details.length
                ? `<tr>
              <td style="padding:26px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${theme.pale};border:1px solid ${theme.border};border-radius:14px;">
                  <tr>
                    <td style="padding:24px 26px;">${detailsRows}</td>
                  </tr>
                </table>
              </td>
            </tr>`
                : ''
            }

            ${
              actionUrl
                ? `<tr>
              <td align="center" style="padding:0 34px 34px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" bgcolor="${theme.primary}" style="border-radius:10px;background:${theme.primary};background-image:linear-gradient(90deg,${theme.primary},${theme.secondary});">
                      <a href="${actionUrl}" target="_blank" style="display:inline-block;padding:15px 30px;color:#ffffff;text-decoration:none;font-size:16px;line-height:1.2;font-weight:800;">${actionLabel ?? 'View details &rarr;'}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:18px 0 0;color:${theme.muted};font-size:12px;line-height:1.6;word-break:break-all;">${actionUrl}</p>
              </td>
            </tr>`
                : ''
            }

            ${
              noteTitle || noteText
                ? `<tr>
              <td style="padding:0 34px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${theme.pale};border-left:4px solid ${theme.secondary};border-radius:10px;">
                  <tr>
                    <td style="padding:18px 18px;">
                      ${noteTitle ? `<p style="margin:0;color:${theme.ink};font-size:14px;line-height:1.7;font-weight:700;">${noteTitle}</p>` : ''}
                      ${noteText ? `<p style="margin:6px 0 0;color:${theme.muted};font-size:14px;line-height:1.7;">${noteText}</p>` : ''}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
                : ''
            }

            ${contentBeforeFooter ?? ''}

            <tr>
              <td style="background:${theme.pale};border-top:1px solid ${theme.border};padding:22px 34px;text-align:center;">
                <p style="margin:0;color:${theme.muted};font-size:12px;line-height:1.7;">${footerText ?? 'This is an automated notification, please do not reply directly to this email.'}</p>
                ${footerLinksHtml}
                <p style="margin:8px 0 0;color:${theme.primary};font-size:13px;line-height:1.7;font-weight:800;">The ${sideQuoteBrand.name} Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const createBusinessReferralClaimEmailTemplate = ({
  businessName,
  referrerName,
  categoryName,
  city,
  state,
  businessEmail,
  businessPhone,
  imageUrl,
  imageUrls,
  rating,
  review,
  source = 'customer',
  publicProfileUrl,
  claimUrl,
  expiryHours,
}: {
  businessName: string;
  referrerName: string;
  categoryName: string;
  city: string;
  state: string;
  businessEmail?: string;
  businessPhone?: string;
  imageUrl?: string;
  imageUrls?: string[];
  rating: number;
  review: string;
  source?: 'customer' | 'admin';
  publicProfileUrl: string;
  claimUrl: string;
  expiryHours: number;
}) => {
  const theme = referralEmailThemes[source];
  const normalizedRating = Math.min(5, Math.max(1, Math.round(rating)));
  const ratingStars = Array.from({ length: 5 }, (_, index) =>
    index < normalizedRating ? '&#9733;' : '&#9734;',
  ).join('');
  const safeReview = escapeHtml(review).replace(/\r?\n/g, '<br />');
  const safeClaimUrl = escapeHtml(claimUrl);
  const safePublicProfileUrl = escapeHtml(publicProfileUrl);
  const referralImages = (
    imageUrls?.length ? imageUrls : imageUrl ? [imageUrl] : []
  ).slice(0, 3);

  const customerImageGallery = referralImages
    .map(
      (url, index) => `${
        index > 0
          ? `<table data-referral-image-divider="true" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:12px 18px;"><div style="height:1px;background:${theme.border};font-size:0;line-height:0;">&nbsp;</div></td></tr></table>`
          : ''
      }
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${theme.panel};border:1px solid ${theme.border};border-radius:10px;">
                            <tr>
                              <td align="center" style="padding:8px;">
                                <img src="${escapeHtml(url)}" width="160" alt="${escapeHtml(businessName)} referral image ${index + 1}" style="display:block;width:100%;max-width:160px;height:auto;margin:0 auto;border:0;border-radius:8px;outline:none;text-decoration:none;" />
                              </td>
                            </tr>
                          </table>`,
    )
    .join('');
  const customerReferralContent = `
            <tr data-customer-referral-card="true">
              <td style="padding:26px 24px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${theme.panel};border:1px solid ${theme.border};border-radius:16px;overflow:hidden;">
                  <tr>
                    ${
                      customerImageGallery
                        ? `<td class="sq-referral-column sq-referral-images" width="38%" valign="top" style="width:38%;padding:12px;background:${theme.pale};">${customerImageGallery}</td>`
                        : ''
                    }
                    <td class="sq-referral-column sq-referral-details" width="${customerImageGallery ? '62%' : '100%'}" valign="top" style="width:${customerImageGallery ? '62%' : '100%'};padding:24px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td>
                            <span style="display:inline-block;padding:5px 9px;background:${theme.primary};color:#ffffff;border-radius:999px;font-size:10px;line-height:1.2;font-weight:800;">Community referral</span>
                            <span style="float:right;display:inline-block;padding:5px 9px;background:#fff7dc;color:#9a6400;border-radius:999px;font-size:10px;line-height:1.2;font-weight:800;">Unclaimed</span>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:18px 0 4px;color:${theme.muted};font-size:10px;line-height:1.4;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;">${escapeHtml(categoryName)}</p>
                      <h2 style="margin:0;color:${theme.ink};font-size:24px;line-height:1.25;font-weight:800;">${escapeHtml(businessName)}</h2>
                      <p style="margin:7px 0 0;color:${theme.muted};font-size:12px;line-height:1.5;">&#9679; ${escapeHtml(`${city}, ${state}`)}</p>
                      <div style="margin:18px 0;background:#fff9e8;border-radius:9px;padding:10px 12px;">
                        <span aria-label="${normalizedRating} out of 5 stars" style="color:#f5b301;font-size:17px;line-height:1;letter-spacing:1px;">${ratingStars}</span>
                        <span style="margin-left:7px;color:${theme.ink};font-size:12px;font-weight:800;">${normalizedRating}.0</span>
                        <span style="margin-left:7px;color:${theme.muted};font-size:10px;">Referral review</span>
                      </div>
                      <div style="border-left:3px solid ${theme.secondary};padding:0 0 0 12px;">
                        <p style="margin:0;color:${theme.muted};font-size:13px;line-height:1.7;">${safeReview}</p>
                      </div>
                      <p style="margin:16px 0 0;color:${theme.muted};font-size:11px;line-height:1.5;">Referred by <strong style="color:${theme.ink};">${escapeHtml(referrerName)}</strong></p>
                      ${businessEmail ? `<p style="margin:12px 0 0;font-size:12px;line-height:1.5;"><a href="mailto:${escapeHtml(businessEmail)}" style="color:${theme.muted};text-decoration:none;">&#9993; ${escapeHtml(businessEmail)}</a></p>` : ''}
                      <div style="margin:20px 0 0;padding:14px 16px;background:${theme.pale};border:1px solid ${theme.border};border-radius:10px;">
                        <a href="${safeClaimUrl}" target="_blank" style="display:inline-block;color:${theme.ink};font-size:13px;line-height:1.4;font-weight:800;text-decoration:underline;">Claim this Business &rarr;</a>
                        <p style="margin:6px 0 0;color:${theme.muted};font-size:10px;line-height:1.5;">For your security, use the private claim link sent to this business email. This link expires in ${expiryHours} hours.</p>
                      </div>
                      <p style="margin:14px 0 0;font-size:11px;line-height:1.5;"><a href="${safePublicProfileUrl}" target="_blank" style="color:${theme.secondary};text-decoration:underline;">View public referral profile</a></p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`;

  const adminGalleryColumnWidth =
    referralImages.length === 3
      ? '33.333'
      : referralImages.length === 2
        ? '50'
        : '100';
  const adminGallery = referralImages.length
    ? `<tr data-admin-referral-gallery="true">
                  <td style="padding:16px 18px 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        ${referralImages
                          .map(
                            (
                              url,
                              index,
                            ) => `<td data-admin-gallery-item="true" width="${adminGalleryColumnWidth}%" valign="top" style="width:${adminGalleryColumnWidth}%;padding:${index === 0 ? '0 5px 0 0' : index === referralImages.length - 1 ? '0 0 0 5px' : '0 5px'};">
                              <a href="${escapeHtml(url)}" target="_blank" title="View full image ${index + 1}" style="display:block;text-decoration:none;">
                                <img src="${escapeHtml(url)}" width="${referralImages.length === 1 ? '540' : referralImages.length === 2 ? '250' : '165'}" alt="${escapeHtml(businessName)} gallery image ${index + 1}" style="display:block;width:100%;max-width:${referralImages.length === 1 ? '540px' : referralImages.length === 2 ? '250px' : '165px'};height:${referralImages.length === 1 ? 'auto' : '135px'};object-fit:cover;margin:0 auto;border:1px solid ${theme.border};border-radius:8px;outline:none;text-decoration:none;" />
                              </a>
                            </td>`,
                          )
                          .join('')}
                      </tr>
                    </table>
                  </td>
                </tr>`
    : '';
  const adminReferralContent = `
            <tr data-admin-business-profile="true">
              <td style="padding:0 24px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${theme.panel};border:1px solid ${theme.border};border-radius:14px;overflow:hidden;">
                  <tr>
                    <td style="padding:16px 20px;background:#fff6d9;border-bottom:1px solid #f2df9f;">
                      <p style="margin:0;color:${theme.ink};font-size:17px;line-height:1.4;font-weight:800;">My Business</p>
                      <p style="margin:3px 0 0;color:${theme.muted};font-size:10px;line-height:1.5;">View your business information and claim your free SideQuote listing.</p>
                    </td>
                  </tr>
                  ${adminGallery}
                  <tr data-admin-business-details="true">
                    <td style="padding:${referralImages.length ? '4px' : '24px'} 28px 26px;">
                      <p style="margin:0 0 6px;color:${theme.ink};font-size:12px;line-height:1.5;font-weight:800;">About This Business</p>
                      <div style="border-left:3px solid ${theme.secondary};padding-left:12px;">
                        <p style="margin:0;color:${theme.muted};font-size:13px;line-height:1.7;">${safeReview}</p>
                      </div>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;">
                        <tr>
                          <td width="50%" valign="top" style="width:50%;padding:0 12px 16px 0;">
                            <p style="margin:0 0 5px;color:${theme.ink};font-size:11px;font-weight:800;">Business Name</p>
                            <p style="margin:0;color:${theme.muted};font-size:12px;line-height:1.5;">${escapeHtml(businessName)}</p>
                          </td>
                          <td width="50%" valign="top" style="width:50%;padding:0 0 16px 12px;">
                            <p style="margin:0 0 5px;color:${theme.ink};font-size:11px;font-weight:800;">Phone Number</p>
                            <p style="margin:0;color:${theme.muted};font-size:12px;line-height:1.5;">${businessPhone ? escapeHtml(businessPhone) : 'Not provided'}</p>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" valign="top" style="width:50%;padding:0 12px 16px 0;">
                            <p style="margin:0 0 5px;color:${theme.ink};font-size:11px;font-weight:800;">Service Category</p>
                            <p style="margin:0;color:${theme.muted};font-size:12px;line-height:1.5;">${escapeHtml(categoryName)}</p>
                          </td>
                          <td width="50%" valign="top" style="width:50%;padding:0 0 16px 12px;">
                            <p style="margin:0 0 5px;color:${theme.ink};font-size:11px;font-weight:800;">Business Email</p>
                            <p style="margin:0;font-size:12px;line-height:1.5;">${businessEmail ? `<a href="mailto:${escapeHtml(businessEmail)}" style="color:${theme.secondary};text-decoration:none;">${escapeHtml(businessEmail)}</a>` : 'Not provided'}</p>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" valign="top" style="padding:0 0 16px;">
                            <p style="margin:0 0 5px;color:${theme.ink};font-size:11px;font-weight:800;">Service Area</p>
                            <p style="margin:0;color:${theme.muted};font-size:12px;line-height:1.5;">${escapeHtml(`${city}, ${state}`)}</p>
                          </td>
                        </tr>
                      </table>
                      <div style="margin:2px 0 0;padding:12px 14px;background:#fff9e8;border-radius:9px;">
                        <span aria-label="${normalizedRating} out of 5 stars" style="color:#f5b301;font-size:17px;line-height:1;letter-spacing:1px;">${ratingStars}</span>
                        <span style="margin-left:7px;color:${theme.ink};font-size:12px;font-weight:800;">${normalizedRating}.0</span>
                        <span style="margin-left:7px;color:${theme.muted};font-size:10px;">Directory rating</span>
                      </div>
                      <div style="margin:20px 0 0;padding:15px 16px;background:${theme.pale};border:1px solid ${theme.border};border-radius:10px;">
                        <a href="${safeClaimUrl}" target="_blank" style="display:inline-block;color:${theme.ink};font-size:14px;line-height:1.4;font-weight:800;text-decoration:underline;">Claim this Business &rarr;</a>
                        <p style="margin:6px 0 0;color:${theme.muted};font-size:10px;line-height:1.5;">Use this private link to claim your free listing. It expires in ${expiryHours} hours.</p>
                      </div>
                      <p style="margin:14px 0 0;font-size:11px;line-height:1.5;"><a href="${safePublicProfileUrl}" target="_blank" style="color:${theme.secondary};text-decoration:underline;">View public business listing</a></p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`;

  return createNotificationEmailTemplate({
    heading: source === 'admin' ? 'Good News!' : 'Your business was referred',
    subheading:
      source === 'admin'
        ? 'Your business has been added to SideQuote! Claim your free listing now to get more leads and access our integrated marketing platform at zero cost.'
        : 'Congrats! A customer has given you a referral. Review the listing and use the secure link to claim this business and update your business profile.',
    introText: undefined,
    showHeading: source === 'admin',
    headerAppearance: source === 'admin' ? 'plain' : 'brand',
    contentAfterHeader:
      source === 'admin' ? adminReferralContent : customerReferralContent,
    footerText:
      source === 'admin'
        ? 'You received this message because your business was added to the SideQuote directory.'
        : 'You received this message because your business email was submitted with a public recommendation.',
    footerLinksHtml: sideQuoteReferralLinksHtml,
    theme,
  });
};

export const createBusinessCategoryApprovedEmailTemplate = ({
  displayName,
  businessName,
  categoryName,
}: {
  displayName: string;
  businessName?: string;
  categoryName: string;
}) =>
  createNotificationEmailTemplate({
    heading: 'Your Business Is Ready!',
    subheading: 'Your requested business category has been approved.',
    greetingName: escapeHtml(displayName || 'there'),
    introText:
      'Great news! Your requested category has been approved, and your business is now ready to connect with customers on SideQuote.',
    details: [
      ...(businessName
        ? [{ label: 'Business Name', value: escapeHtml(businessName) }]
        : []),
      { label: 'Approved Category', value: escapeHtml(categoryName) },
    ],
    noteTitle: "You're ready for business",
    noteText:
      'You can now manage your business profile, add services, showcase your work, and respond to customer opportunities from your account.',
    footerText:
      'This is an automated business approval notification from SideQuote. Please do not reply directly to this email.',
  });
