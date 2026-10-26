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
    expect(template).toContain('Claim this Business');
    expect(template).toContain('token=secret');
    expect(template).toContain('expires in 72 hours');
<<<<<<< HEAD
    expect(template).toContain('Referral review');
    expect(template).toContain('5.0');
=======
    expect(template).toContain('Customer rating');
    expect(template).toContain('5/5');
>>>>>>> 667d3907234a3e90fbfbbd45cbb55973fbedbf6f
    expect(template).toContain('&lt;Excellent &amp; dependable&gt;');
    expect(template).toContain('https://example.com/referral.jpg');
    expect(template).not.toContain('data-referral-image-divider="true"');
    expect(template.indexOf('data-customer-referral-card')).toBeLessThan(
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
      businessEmail: 'owner@acme.example',
      imageUrls: [
        'https://example.com/referral-1.jpg',
        'https://example.com/referral-2.jpg',
        'https://example.com/referral-3.jpg',
      ],
      rating: 4,
      review: 'Excellent service and communication.',
      source: 'customer',
      publicProfileUrl:
        'https://sidequote.cloud/business-referrals/acme-plumbing',
      claimUrl: 'https://sidequote.cloud/business-referrals/claim?token=secret',
      expiryHours: 72,
    });

    expect(template).not.toContain(
      '<h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.25;font-weight:800;">Your business was referred</h1>',
    );
    expect(template).not.toContain(
      'A customer recommended your business on SideQuote.',
    );
    expect(template).toContain(
      'Congrats! A customer has given you a referral.',
    );
    expect(
      template.match(/Congrats! A customer has given you a referral\./g),
    ).toHaveLength(1);
    expect(template).toContain('background:#078bd6');
    expect(template).toContain('data-customer-referral-card="true"');
    expect(template).toContain('class="sq-referral-column sq-referral-images"');
    expect(template).toContain(
      'class="sq-referral-column sq-referral-details"',
    );
    expect(template).toContain('https://example.com/referral-1.jpg');
    expect(template).toContain('https://example.com/referral-2.jpg');
    expect(template).toContain('https://example.com/referral-3.jpg');
    expect(template.match(/data-referral-image-divider="true"/g)).toHaveLength(
      2,
    );
    expect(template).toContain('max-width:160px');
    expect(template.indexOf('https://example.com/referral-1.jpg')).toBeLessThan(
      template.indexOf('Acme Plumbing</h2>'),
    );
    expect(template).toContain('mailto:owner@acme.example');
    expect(template).toContain(
      'href="https://sidequote.cloud/business-referrals/claim?token=secret"',
    );
    expect(template).toContain('https://sidequote.cloud/about-us');
    expect(template).toContain('https://sidequote.cloud/#faq');
    expect(template).not.toContain('https://sidequote.cloud/privacy-policy');
    expect(template).not.toContain(
      'https://sidequote.cloud/terms-and-condition',
    );
  });

  it('renders the admin referral as a white business-profile email', () => {
    const template = createBusinessReferralClaimEmailTemplate({
      businessName: 'Acme Plumbing',
      referrerName: 'SideQuote Admin',
      categoryName: 'Plumbing',
      city: 'Austin',
      state: 'Texas',
      businessEmail: 'owner@acme.example',
      businessPhone: '+1 512 555 0100',
      imageUrls: [
        'https://example.com/referral-1.jpg',
        'https://example.com/referral-2.jpg',
      ],
      rating: 5,
      review: 'Verified by the SideQuote directory team.',
      source: 'admin',
      publicProfileUrl:
        'https://sidequote.cloud/business-referrals/acme-plumbing',
      claimUrl: 'https://sidequote.cloud/business-referrals/claim?token=secret',
      expiryHours: 72,
    });

    expect(template).toContain('Good News!');
    expect(template).toContain(
      'Your business has been added to SideQuote! Claim your free listing now to get more leads and access our integrated marketing platform at zero cost.',
    );
    expect(template).not.toContain('Your business was referred');
    expect(template).not.toContain(
      'You&rsquo;ve been added to the business directory!',
    );
    expect(template).toContain('background:#ffffff;background-image:none');
    expect(template).toContain('data-admin-business-profile="true"');
    expect(template).toContain('data-admin-referral-gallery="true"');
    expect(template).toContain('padding:16px 18px 22px');
    expect(template).toContain('https://example.com/referral-1.jpg');
    expect(template).toContain('https://example.com/referral-2.jpg');
    expect(template.match(/data-admin-gallery-item="true"/g)).toHaveLength(2);
    expect(template).toContain('width="50%"');
    expect(template).toContain('href="https://example.com/referral-1.jpg"');
    expect(template).toContain('title="View full image 1"');
    expect(template).toContain('My Business');
    expect(template).toContain('Acme Plumbing');
    expect(template).toContain('+1 512 555 0100');
    expect(template).toContain('mailto:owner@acme.example');
    expect(template).toContain('Claim this Business');
  });

  it('moves admin business details directly below the header when no images exist', () => {
    const template = createBusinessReferralClaimEmailTemplate({
      businessName: 'Acme Plumbing',
      referrerName: 'SideQuote Admin',
      categoryName: 'Plumbing',
      city: 'Austin',
      state: 'Texas',
      businessEmail: 'owner@acme.example',
      rating: 5,
      review: 'Verified by the SideQuote directory team.',
      source: 'admin',
      publicProfileUrl:
        'https://sidequote.cloud/business-referrals/acme-plumbing',
      claimUrl: 'https://sidequote.cloud/business-referrals/claim?token=secret',
      expiryHours: 72,
    });

    expect(template).not.toContain('data-admin-referral-gallery="true"');
    expect(template).not.toContain('gallery image');
    expect(template).toContain('data-admin-business-details="true"');
    expect(template.indexOf('data-admin-business-profile')).toBeLessThan(
      template.indexOf('data-admin-business-details'),
    );
<<<<<<< HEAD
  });

  it('renders three admin gallery images as linked columns in one row', () => {
    const template = createBusinessReferralClaimEmailTemplate({
      businessName: 'Acme Plumbing',
      referrerName: 'SideQuote Admin',
      categoryName: 'Plumbing',
      city: 'Austin',
      state: 'Texas',
      imageUrls: [
        'https://example.com/admin-1.jpg',
        'https://example.com/admin-2.jpg',
        'https://example.com/admin-3.jpg',
      ],
      rating: 5,
      review: 'Verified by the SideQuote directory team.',
      source: 'admin',
      publicProfileUrl:
        'https://sidequote.cloud/business-referrals/acme-plumbing',
      claimUrl: 'https://sidequote.cloud/business-referrals/claim?token=secret',
      expiryHours: 72,
    });

    expect(template.match(/data-admin-gallery-item="true"/g)).toHaveLength(3);
    expect(template.match(/width="33\.333%"/g)).toHaveLength(3);
    expect(template).toContain('href="https://example.com/admin-3.jpg"');
  });

  it('renders referral details safely when no referral image was provided', () => {
    const template = createBusinessReferralClaimEmailTemplate({
      businessName: 'Acme Plumbing',
      referrerName: 'Helpful User',
      categoryName: 'Plumbing',
      city: 'Austin',
      state: 'Texas',
      rating: 5,
      review: 'Excellent service and communication.',
      source: 'customer',
      publicProfileUrl:
        'https://sidequote.cloud/business-referrals/acme-plumbing',
      claimUrl: 'https://sidequote.cloud/business-referrals/claim?token=secret',
      expiryHours: 72,
    });

    expect(template).not.toContain('Acme Plumbing referral image');
    expect(template).toContain('Referral review');
    expect(template).toContain('Excellent service and communication.');
=======
    expect(template).toContain('background:#171b4b');
>>>>>>> 667d3907234a3e90fbfbbd45cbb55973fbedbf6f
  });
});
