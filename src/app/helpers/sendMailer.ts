import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { Resend } from 'resend';
import config from '../config';
import { SIDEQUOTE_EMAIL_LOGO_CID } from './template';

type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
  cid?: string;
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
  };

  return sideQuoteLogoAttachment;
};

const sendMailer = async (
  email: string,
  subject?: string,
  html?: string,
  attachments?: MailAttachment[],
) => {
  const apiKey = config.email.resendApiKey;
  const sender = config.email.from;
  const replyTo = config.email.replyTo;

  if (!apiKey || !sender) {
    throw new Error('Email config is incomplete. Please set RESEND_API_KEY.');
  }

  const resend = new Resend(apiKey);

  const logoAttachment = getSideQuoteLogoAttachment();
  const logoCid = `${SIDEQUOTE_EMAIL_LOGO_CID}-${randomUUID()}@sidequote.cloud`;
  const emailHtml = logoAttachment
    ? html?.replaceAll(`cid:${SIDEQUOTE_EMAIL_LOGO_CID}`, `cid:${logoCid}`)
    : html;
  const { data, error } = await resend.emails.send({
    from: `"SideQuote" <${sender}>`,
    replyTo,
    to: email,
    subject: subject || '',
    html: emailHtml || '',
    attachments: [
      ...(logoAttachment
        ? [
            {
              filename: logoAttachment.filename,
              content: logoAttachment.content,
              contentType: logoAttachment.contentType,
              contentId: logoCid,
            },
          ]
        : []),
      ...(attachments ?? []).map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
        contentId: attachment.cid,
      })),
    ],
  });

  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }

  console.log('Message sent:', data?.id);
};

export default sendMailer;
