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

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: 'logo.webp',
            content: expect.any(Buffer),
            contentType: 'image/webp',
            cid: SIDEQUOTE_EMAIL_LOGO_CID,
            contentDisposition: 'inline',
          }),
        ]),
      }),
    );
  });
});
