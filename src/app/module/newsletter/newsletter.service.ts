import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import config from 'src/app/config';
import sendMailer from 'src/app/helpers/sendMailer';
import { createNewsletterEmailTemplate } from 'src/app/helpers/template';
import { User, UserDocument } from 'src/app/module/user/entities/user.entity';
import { SendNewsletterDto } from './dto/send-newsletter.dto';
import {
  getBusinessProfile,
  getDefaultRole,
  getPersonalProfile,
} from 'src/app/helpers/account-profile';

const EMAIL_BATCH_SIZE = 10;

@Injectable()
export class NewsletterService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private buildDisplayName(user: UserDocument) {
    const personalProfile = getPersonalProfile(user);
    const fullName = [personalProfile.firstName, personalProfile.lastName]
      .filter(Boolean)
      .join(' ');
    const businessName = getBusinessProfile(user).businessName;

    return (
      (getDefaultRole(user) === 'businessOwner' ? businessName : fullName) ||
      fullName ||
      businessName ||
      user.username ||
      'SideQuote member'
    );
  }

  private buildPlatformUrl() {
    return (config.frontendUrl || 'https://sidequote.cloud').replace(
      /\/+$/,
      '',
    );
  }

  private async getRecipients(sendNewsletterDto: SendNewsletterDto) {
    const baseConditions = {
      $and: [
        {
          $or: [
            { accountStatus: 'active' },
            { accountStatus: { $exists: false }, status: 'active' },
          ],
        },
        {
          $or: [
            { roles: { $in: ['user', 'businessOwner'] } },
            { role: { $in: ['user', 'businessOwner'] } },
          ],
        },
      ],
      email: { $exists: true, $ne: '' },
    };
    const whereConditions =
      sendNewsletterDto.recipientType === 'selected'
        ? {
            ...baseConditions,
            _id: {
              $in: [...new Set(sendNewsletterDto.selectedUserIds ?? [])],
            },
          }
        : baseConditions;

    return this.userModel
      .find(whereConditions)
      .select(
        'email firstName lastName username businessName role roles defaultRole userProfile businessProfile',
      );
  }

  async sendNewsletter(sendNewsletterDto: SendNewsletterDto) {
    const recipients = await this.getRecipients(sendNewsletterDto);

    if (!recipients.length) {
      throw new HttpException('No active newsletter recipients found', 400);
    }

    let successfulDeliveries = 0;
    let failedDeliveries = 0;

    for (let index = 0; index < recipients.length; index += EMAIL_BATCH_SIZE) {
      const batch = recipients.slice(index, index + EMAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((recipient) =>
          sendMailer(
            recipient.email,
            sendNewsletterDto.subject,
            createNewsletterEmailTemplate({
              displayName: this.buildDisplayName(recipient),
              subject: sendNewsletterDto.subject,
              content: sendNewsletterDto.content,
              platformUrl: this.buildPlatformUrl(),
            }),
          ),
        ),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          successfulDeliveries += 1;
        } else {
          failedDeliveries += 1;
        }
      }
    }

    const requestedRecipients =
      sendNewsletterDto.recipientType === 'selected'
        ? new Set(sendNewsletterDto.selectedUserIds ?? []).size
        : recipients.length;

    return {
      recipientType: sendNewsletterDto.recipientType,
      requestedRecipients,
      matchedActiveRecipients: recipients.length,
      successfulDeliveries,
      failedDeliveries,
      skippedRecipients: requestedRecipients - recipients.length,
    };
  }
}
