// import nodemailer from 'nodemailer';
// import config from '../config';

// const sendMailer = async (email: string, subject?: string, html?: string) => {
//   const transporter = nodemailer.createTransport({
//     host: config.email.host,
//     port: Number(config.email.port),
//     secure: false,
//     auth: {
//       user: config.email.address,
//       pass: config.email.pass,
//     },
//   });
//   const info = await transporter.sendMail({
//     from: `"YELO HEAT" ${config.email.from}`,
//     to: email,
//     subject,
//     html,
//   });

//   console.log('Message sent:', info.messageId);
// };

// export default sendMailer;
import nodemailer, { Transporter } from 'nodemailer';
import * as fs from 'fs';
import { join } from 'path';
import config from '../config';
import { SIDEQUOTE_EMAIL_LOGO_CID } from './template';

let transporter: Transporter | undefined;

type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
  cid?: string;
  contentDisposition?: 'attachment' | 'inline';
};

let sideQuoteLogoAttachment: MailAttachment | null | undefined;

const getSideQuoteLogoAttachment = () => {
  if (sideQuoteLogoAttachment !== undefined) {
    return sideQuoteLogoAttachment;
  }

  const logoPath = join(process.cwd(), 'logo.webp');
  if (!fs.existsSync(logoPath)) {
    sideQuoteLogoAttachment = null;
    return sideQuoteLogoAttachment;
  }

  sideQuoteLogoAttachment = {
    filename: 'logo.webp',
    content: fs.readFileSync(logoPath),
    contentType: 'image/webp',
    cid: SIDEQUOTE_EMAIL_LOGO_CID,
    contentDisposition: 'inline',
  };

  return sideQuoteLogoAttachment;
};

const sendMailer = async (
  email: string,
  subject?: string,
  html?: string,
  attachments?: MailAttachment[],
) => {
  const port = Number(config.email.port || 587);
  const authUser = config.email.address || config.email.from;
  const authPass = config.email.pass;
  const sender = config.email.from || authUser;

  if (!config.email.host || !authUser || !authPass || !sender) {
    throw new Error(
      'Email config is incomplete. Please set EMAIL_HOST, EMAIL_PORT, EMAIL_ADDRESS/EMAIL_FROM and EMAIL_PASS.',
    );
  }

  transporter ??= nodemailer.createTransport({
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    host: config.email.host,
    port,
    secure: port === 465,
    auth: {
      user: authUser,
      pass: authPass,
    },
    // Keep dev flexible for local SMTP providers; production should validate certs.
    tls: {
      rejectUnauthorized: config.env === 'production',
    },
  });

  try {
    const logoAttachment = getSideQuoteLogoAttachment();
    const info = await transporter.sendMail({
      from: `"SideQuote" <${sender}>`,
      to: email,
      subject,
      html,
      attachments: [
        ...(logoAttachment ? [logoAttachment] : []),
        ...(attachments ?? []),
      ],
    });

    console.log('Message sent:', info.messageId);
  } catch (error: unknown) {
    const smtpError = error as {
      response?: unknown;
      message?: unknown;
      code?: unknown;
    };
    const response = String(smtpError.response || '').toLowerCase();
    const message = String(smtpError.message || '');

    if (
      smtpError.code === 'EAUTH' ||
      response.includes('535') ||
      response.includes('authentication rejected') ||
      message.toLowerCase().includes('invalid login')
    ) {
      throw new Error(
        'Email login failed (SMTP 535). Check EMAIL_ADDRESS/EMAIL_PASS and use provider app-password if required.',
      );
    }

    throw error;
  }
};

export default sendMailer;
