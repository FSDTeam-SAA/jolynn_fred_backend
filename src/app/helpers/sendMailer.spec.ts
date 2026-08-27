jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));
jest.mock('../config', () => ({
  __esModule: true,
  default: {
    env: 'test',
    email: {
      host: 'smtp.example.com',
      port: '587',
      address: 'mailer@example.com',
      pass: 'secret',
      from: 'sender@example.com',
      publicFrom: 'noreply@sidequote.com',
      replyTo: 'noreply@sidequote.com',
    },
  },
}));

import nodemailer from 'nodemailer';
import sendMailer from './sendMailer';
import { SIDEQUOTE_EMAIL_LOGO_CID } from './template';

describe('sendMailer', () => {
  it('embeds logo.webp inline in every outgoing email', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'message-1' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

    await sendMailer(
      'recipient@example.com',
      'Test email',
      `<img src="cid:${SIDEQUOTE_EMAIL_LOGO_CID}" alt="SideQuote" />`,
    );

    const mailOptions = sendMail.mock.calls[0][0];
    const logoAttachment = mailOptions.attachments.find(
      (attachment: { filename?: string }) =>
        attachment.filename === 'logo.webp',
    );

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"SideQuote" <noreply@sidequote.com>',
        replyTo: '"SideQuote No Reply" <noreply@sidequote.com>',
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: 'logo.webp',
            content: expect.any(Buffer),
            contentType: 'image/webp',
            cid: expect.stringMatching(/^sidequote-logo-.+@sidequote\.cloud$/),
            contentDisposition: 'inline',
          }),
        ]),
      }),
    );
    expect(mailOptions.html).toContain(`src="cid:${logoAttachment.cid}"`);
  });
});
