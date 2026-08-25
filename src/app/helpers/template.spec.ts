import {
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
    ];

    for (const template of templates) {
      expect(template).toContain(`src="cid:${SIDEQUOTE_EMAIL_LOGO_CID}"`);
      expect(template).toContain('alt="SideQuote"');
      expect(template).not.toContain('&ldquo;');
    }
  });
});
