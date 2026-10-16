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
        imageUrl: 'https://example.com/referral.jpg',
        rating: 5,
        review: 'Excellent service and communication.',
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
      imageUrl: 'https://example.com/referral.jpg',
      rating: 5,
      review: '<Excellent & dependable>',
      publicProfileUrl:
        'https://sidequote.cloud/business-referrals/acme-plumbing',
      claimUrl: 'https://sidequote.cloud/business-referrals/claim?token=secret',
      expiryHours: 72,
    });

    expect(template).toContain('&lt;Acme &amp; Sons&gt;');
    expect(template).toContain('Claim this business');
    expect(template).toContain('token=secret');
    expect(template).toContain('expires in 72 hours');
    expect(template).toContain('Customer rating');
    expect(template).toContain('5/5');
    expect(template).toContain('&lt;Excellent &amp; dependable&gt;');
    expect(template).toContain('https://example.com/referral.jpg');
    expect(template.indexOf('data-referral-content')).toBeLessThan(
      template.indexOf('You received this message'),
    );
  });

  it('renders customer referral copy with the light-blue theme', () => {
    const template = createBusinessReferralClaimEmailTemplate({
      businessName: 'Acme Plumbing',
      referrerName: 'Helpful User',
      categoryName: 'Plumbing',
      city: 'Austin',
      state: 'Texas',
      imageUrl: 'https://example.com/referral.jpg',
      rating: 4,
      review: 'Excellent service and communication.',
      source: 'customer',
      publicProfileUrl:
        'https://sidequote.cloud/business-referrals/acme-plumbing',
      claimUrl: 'https://sidequote.cloud/business-referrals/claim?token=secret',
      expiryHours: 72,
    });

    expect(template).toContain('Your business was referred');
    expect(template).toContain(
      'A customer recommended your business on SideQuote.',
    );
    expect(template).toContain(
      'Congrats! A customer has given you a referral.',
    );
    expect(template).toContain('background:#078bd6');
  });

  it('renders admin referral copy with the dark-blue theme', () => {
    const template = createBusinessReferralClaimEmailTemplate({
      businessName: 'Acme Plumbing',
      referrerName: 'SideQuote Admin',
      categoryName: 'Plumbing',
      city: 'Austin',
      state: 'Texas',
      imageUrl: 'https://example.com/referral.jpg',
      rating: 5,
      review: 'Verified by the SideQuote directory team.',
      source: 'admin',
      publicProfileUrl:
        'https://sidequote.cloud/business-referrals/acme-plumbing',
      claimUrl: 'https://sidequote.cloud/business-referrals/claim?token=secret',
      expiryHours: 72,
    });

    expect(template).toContain('Your business was referred');
    expect(template).toContain(
      'You&rsquo;ve been added to the business directory! Claim your business now.',
    );
    expect(template).toContain(
      'By being part of the SideQuote business directory platform you can reach new customers without the overhead.',
    );
    expect(template).toContain(
      'Your business was added to the directory by the admin, please claim this business to interact with customers.',
    );
    expect(template).toContain('background:#171b4b');
  });
});
