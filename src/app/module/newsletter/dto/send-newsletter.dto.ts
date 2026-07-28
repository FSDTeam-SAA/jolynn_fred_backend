import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const NEWSLETTER_RECIPIENT_TYPES = ['all', 'selected'] as const;

export type NewsletterRecipientType =
  (typeof NEWSLETTER_RECIPIENT_TYPES)[number];

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SendNewsletterDto {
  @ApiProperty({
    enum: NEWSLETTER_RECIPIENT_TYPES,
    example: 'all',
    description:
      'Send to every active user or only the active users listed in selectedUserIds',
  })
  @IsEnum(NEWSLETTER_RECIPIENT_TYPES)
  recipientType: NewsletterRecipientType;

  @ApiPropertyOptional({
    type: [String],
    example: ['507f1f77bcf86cd799439011'],
    description: 'Required when recipientType is selected',
  })
  @ValidateIf((dto: SendNewsletterDto) => dto.recipientType === 'selected')
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(1000)
  @IsMongoId({ each: true })
  selectedUserIds?: string[];

  @ApiProperty({
    example: 'What is new at SideQuote',
    maxLength: 200,
  })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty({
    example:
      'We have added new ways to discover trusted local businesses near you.',
    maxLength: 50000,
  })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  content: string;
}
