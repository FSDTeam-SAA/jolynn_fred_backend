import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ example: '665f1f1f1f1f1f1f1f1f1f1f' })
  @IsMongoId()
  businessOwnerId: string;

  @ApiProperty({ example: 'Question about your plumbing service' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'I would like to know your availability next week.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description:
      'Optional PDF, image, or document attachments. Use the attachments field.',
  })
  @IsOptional()
  attachments?: unknown[];
}

export class ReplyMessageDto {
  @ApiProperty({
    example: 'Thanks for reaching out. I am available on Tuesday.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description:
      'Optional PDF, image, or document attachments. Use the attachments field.',
  })
  @IsOptional()
  attachments?: unknown[];
}

export class MessageListQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  limit?: number;
}
