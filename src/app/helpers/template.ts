type NotificationEmailParams = {
  heading: string;
  subheading?: string;
  greetingName?: string;
  introText: string;
  details?: { label: string; value: string }[];
  noteTitle?: string;
  noteText?: string;
  footerText?: string;
};

type PasswordResetTemplateParams = {
  otp: string | number;
  expiryMinutes?: number;
};

type RegistrationConfirmationTemplateParams = {
  displayName: string;
  loginUrl: string;
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
  accountType,
}: RegistrationConfirmationTemplateParams) => {
  const safeDisplayName = escapeHtml(displayName || 'there');
  const safeLoginUrl = escapeHtml(loginUrl);
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
                <div style="display:inline-block;width:54px;height:54px;line-height:54px;background:#ffffff;border-radius:50%;margin-bottom:18px;color:${sideQuoteBrand.secondary};font-family:Georgia,serif;font-size:36px;font-weight:700;">&ldquo;</div>
                <h1 style="margin:0;color:#ffffff;font-size:30px;line-height:1.25;font-weight:800;">Welcome to ${sideQuoteBrand.name}</h1>
                <p style="margin:12px 0 0;color:#eaf7ff;font-size:16px;line-height:1.6;">Your account is ready. Let&rsquo;s get you signed in.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:38px 38px 12px;">
                <p style="margin:0 0 16px;color:${sideQuoteBrand.ink};font-size:17px;line-height:1.7;font-weight:700;">Hello ${safeDisplayName},</p>
                <p style="margin:0;color:${sideQuoteBrand.muted};font-size:15px;line-height:1.8;">
                  Thank you for joining ${sideQuoteBrand.name}. Your registration has been completed successfully, and you can now log in to explore services, connect with the community, and manage your profile.
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
                      <a href="${safeLoginUrl}" target="_blank" style="display:inline-block;padding:15px 30px;color:#ffffff;text-decoration:none;font-size:16px;line-height:1.2;font-weight:800;">Log in to your account &rarr;</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 6px;color:${sideQuoteBrand.muted};font-size:13px;line-height:1.6;">If the button does not work, copy and paste this link into your browser:</p>
                <p style="margin:0;word-break:break-all;font-size:13px;line-height:1.6;"><a href="${safeLoginUrl}" style="color:${sideQuoteBrand.secondary};text-decoration:underline;">${safeLoginUrl}</a></p>
              </td>
            </tr>

            <tr>
              <td style="background:#f7fbfd;border-top:1px solid ${sideQuoteBrand.border};padding:24px 34px;text-align:center;">
                <p style="margin:0;color:${sideQuoteBrand.muted};font-size:12px;line-height:1.7;">If you did not create this account, please contact our support team.</p>
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
                <div style="display:inline-block;width:48px;height:48px;line-height:48px;background:#ffffff;border-radius:50%;margin-bottom:16px;color:${sideQuoteBrand.secondary};font-family:Georgia,serif;font-size:32px;font-weight:700;">&ldquo;</div>
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
  <body style="margin:0;padding:0;background:${brand.cream};font-family:Arial,Helvetica,sans-serif;color:${brand.ink};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${brand.cream};margin:0;padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:${brand.panel};border:1px solid ${brand.border};border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(39,42,37,0.10);">
            <tr>
              <td style="background:${brand.primary};padding:34px 34px 30px;text-align:center;">
                <div style="display:inline-block;background:${brand.cream};border-radius:999px;padding:10px 18px;margin-bottom:18px;">
                  <span style="font-family:Georgia,serif;font-size:22px;letter-spacing:4px;color:${brand.gold};font-weight:700;">${brand.name}</span>
                </div>
                <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.25;font-weight:700;">Reset your password</h1>
                <p style="margin:10px 0 0;color:#ece8df;font-size:15px;line-height:1.6;">Use the verification code below to continue securely.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:36px 34px 10px;">
                <p style="margin:0 0 16px;color:${brand.ink};font-size:16px;line-height:1.7;">Hello,</p>
                <p style="margin:0;color:${brand.muted};font-size:15px;line-height:1.8;">
                  We received a request to reset the password for your ${brand.name} account. Enter this one-time password in the app to verify your identity.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:26px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid ${brand.border};border-radius:14px;">
                  <tr>
                    <td align="center" style="padding:28px 20px;">
                      <p style="margin:0 0 12px;color:${brand.muted};font-size:13px;line-height:1;text-transform:uppercase;letter-spacing:1.6px;font-weight:700;">Your OTP Code</p>
                      <div style="display:inline-block;background:${brand.cream};border:1px solid ${brand.border};border-radius:12px;padding:16px 24px;">
                        <span style="font-size:34px;line-height:1;letter-spacing:8px;color:${brand.primaryDark};font-weight:800;">${otpCode}</span>
                      </div>
                      <p style="margin:16px 0 0;color:${brand.muted};font-size:14px;line-height:1.6;">This code expires in ${expiryMinutes} minutes.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 34px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8f6f1;border-left:4px solid ${brand.gold};border-radius:10px;">
                  <tr>
                    <td style="padding:18px 18px;">
                      <p style="margin:0;color:${brand.ink};font-size:14px;line-height:1.7;font-weight:700;">Didn’t request this?</p>
                      <p style="margin:6px 0 0;color:${brand.muted};font-size:14px;line-height:1.7;">
                        You can safely ignore this email. Your password will not change unless this code is verified.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff;border-top:1px solid ${brand.border};padding:22px 34px;text-align:center;">
                <p style="margin:0;color:${brand.muted};font-size:12px;line-height:1.7;">For your security, never share this code with anyone.</p>
                <p style="margin:8px 0 0;color:${brand.primary};font-size:12px;line-height:1.7;font-weight:700;">${brand.name} Support Team</p>
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
                <div style="display:inline-block;background:${brand.cream};border-radius:999px;padding:10px 18px;margin-bottom:18px;">
                  <span style="font-family:Georgia,serif;font-size:22px;letter-spacing:4px;color:${brand.gold};font-weight:700;">${brand.name}</span>
                </div>
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
}: NotificationEmailParams) => {
  const detailsRows = details
    .map(
      (item) => `
                      <p style="margin:0 0 12px;color:${sideQuoteBrand.muted};font-size:14px;line-height:1.8;font-weight:700;">${item.label}</p>
                      <p style="margin:0 0 16px;color:${sideQuoteBrand.ink};font-size:16px;line-height:1.7;">${item.value}</p>`,
    )
    .join('');

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${heading}</title>
  </head>
  <body style="margin:0;padding:0;background:${sideQuoteBrand.pale};font-family:Arial,Helvetica,sans-serif;color:${sideQuoteBrand.ink};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:${sideQuoteBrand.pale};margin:0;padding:36px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:${sideQuoteBrand.panel};border:1px solid ${sideQuoteBrand.border};border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(30,48,93,0.14);">
            <tr>
              <td style="background:${sideQuoteBrand.primary};background-image:linear-gradient(135deg,${sideQuoteBrand.primary} 0%,${sideQuoteBrand.secondary} 100%);padding:34px 34px 30px;text-align:center;">
                <div style="display:inline-block;width:48px;height:48px;line-height:48px;background:#ffffff;border-radius:50%;margin-bottom:16px;color:${sideQuoteBrand.secondary};font-family:Georgia,serif;font-size:32px;font-weight:700;">&ldquo;</div>
                <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.25;font-weight:800;">${heading}</h1>
                ${subheading ? `<p style="margin:10px 0 0;color:#eaf7ff;font-size:15px;line-height:1.6;">${subheading}</p>` : ''}
              </td>
            </tr>

            <tr>
              <td style="padding:36px 34px 10px;">
                ${greetingName ? `<p style="margin:0 0 16px;color:${sideQuoteBrand.ink};font-size:16px;line-height:1.7;font-weight:700;">Hello ${greetingName},</p>` : ''}
                <p style="margin:0;color:${sideQuoteBrand.muted};font-size:15px;line-height:1.8;">${introText}</p>
              </td>
            </tr>

            ${
              details.length
                ? `<tr>
              <td style="padding:26px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f9fd;border:1px solid ${sideQuoteBrand.border};border-radius:14px;">
                  <tr>
                    <td style="padding:24px 26px;">${detailsRows}</td>
                  </tr>
                </table>
              </td>
            </tr>`
                : ''
            }

            ${
              noteTitle || noteText
                ? `<tr>
              <td style="padding:0 34px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f9fd;border-left:4px solid ${sideQuoteBrand.secondary};border-radius:10px;">
                  <tr>
                    <td style="padding:18px 18px;">
                      ${noteTitle ? `<p style="margin:0;color:${sideQuoteBrand.ink};font-size:14px;line-height:1.7;font-weight:700;">${noteTitle}</p>` : ''}
                      ${noteText ? `<p style="margin:6px 0 0;color:${sideQuoteBrand.muted};font-size:14px;line-height:1.7;">${noteText}</p>` : ''}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
                : ''
            }

            <tr>
              <td style="background:#f7fbfd;border-top:1px solid ${sideQuoteBrand.border};padding:22px 34px;text-align:center;">
                <p style="margin:0;color:${sideQuoteBrand.muted};font-size:12px;line-height:1.7;">${footerText ?? 'This is an automated notification, please do not reply directly to this email.'}</p>
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