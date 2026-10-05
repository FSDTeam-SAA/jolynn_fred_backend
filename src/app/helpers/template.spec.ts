import {
  createBusinessReferralClaimEmailTemplate,
  createForgotPasswordEmailTemplate,
  createNewsletterEmailTemplate,
  createNotificationEmailTemplate,
  createPaymentSuccessEmailTemplate,
  createRegistrationConfirmationEmailTemplate,
  SIDEQUOTE_EMAIL_LOGO_CID,
} from './template';

describe('email templates', () => {
  it('uses the embedded SideQuote logo in every email template', () => {
    const templates = [
      createRegistrationConfirmationEmailTemplate({
        displayName: 'Test User',
        loginUrl: 'https://sidequote.cloud/login',
        accountType: 'user',
      }),
      createNewsletterEmailTemplate({
        displayName: 'Test User',
        subject: 'Latest news',
        content: 'Newsletter content',
        platformUrl: 'https://sidequote.cloud',
      }),
      createForgotPasswordEmailTemplate({ otp: '123456' }),
      createPaymentSuccessEmailTemplate({
        paymentId: 'payment-1',
        amount: 25,
        currency: 'USD',
        paymentDate: '2026-08-25',
      }),
      createNotificationEmailTemplate({
        heading: 'Notification',
        introText: 'Notification content',
      }),
      createBusinessReferralClaimEmailTemplate({
        businessName: 'Acme Plumbing',
        referrerName: 'Test User',
        categoryName: 'Plumbing',
        city: 'Austin',
        state: 'Texas',
        publicProfileUrl:
          'https://sidequote.cloud/business-referrals/acme-plumbing',
        claimUrl:
          'https://sidequote.cloud/business-referrals/claim?token=secret',
        expiryHours: 72,
      }),
    ];

    for (const template of templates) {
      expect(template).toContain(`src="cid:${SIDEQUOTE_EMAIL_LOGO_CID}"`);
      expect(template).toContain('alt="SideQuote"');
      expect(template).not.toContain('&ldquo;');
    }
  });

  it('escapes referral content and includes the secure claim action', () => {
    const template = createBusinessReferralClaimEmailTemplate({
      businessName: '<Acme & Sons>',
      referrerName: 'Helpful User',
      categoryName: 'Plumbing',
      city: 'Austin',
      state: 'Texas',
      publicProfileUrl:
        'https://sidequote.cloud/business-referrals/acme-plumbing',
      claimUrl: 'https://sidequote.cloud/business-referrals/claim?token=secret',
      expiryHours: 72,
    });

    expect(template).toContain('&lt;Acme &amp; Sons&gt;');
    expect(template).toContain('Claim this business');
    expect(template).toContain('token=secret');
    expect(template).toContain('expires in 72 hours');
  });
});
