jest.mock('resend', () => ({
  __esModule: true,
  Resend: jest.fn(),
}));
jest.mock('../config', () => ({
  __esModule: true,
  default: {
    email: {
      resendApiKey: 're_test_key',
      from: 'noreply@sidequote.cloud',
      replyTo: 'noreply@sidequote.cloud',
    },
  },
}));

import { Resend } from 'resend';
import sendMailer from './sendMailer';
import { SIDEQUOTE_EMAIL_LOGO_CID } from './template';

describe('sendMailer', () => {
  it('embeds logo.webp inline in every outgoing email', async () => {
    const send = jest.fn().mockResolvedValue({ data: { id: 'message-1' } });
    (Resend as jest.Mock).mockImplementation(() => ({ emails: { send } }));

    await sendMailer(
      'recipient@example.com',
      'Test email',
      `<img src="cid:${SIDEQUOTE_EMAIL_LOGO_CID}" alt="SideQuote" />`,
    );

    const mailOptions = send.mock.calls[0][0];
    const logoAttachment = mailOptions.attachments.find(
      (attachment: { filename?: string }) =>
        attachment.filename === 'logo.webp',
    );

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"SideQuote" <noreply@sidequote.cloud>',
        replyTo: 'noreply@sidequote.cloud',
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: 'logo.webp',
            content: expect.any(Buffer),
            contentType: 'image/webp',
            contentId: expect.stringMatching(
              /^sidequote-logo-.+@sidequote\.cloud$/,
            ),
          }),
        ]),
      }),
    );
    expect(mailOptions.html).toContain(
      `src="cid:${logoAttachment.contentId}"`,
    );
  });
});
