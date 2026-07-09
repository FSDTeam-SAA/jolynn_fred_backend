import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ReplyReviewDto {
  @ApiProperty({
    example: 'Thank you for the feedback. We appreciate your support.',
  })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1500)
  message: string;
}
