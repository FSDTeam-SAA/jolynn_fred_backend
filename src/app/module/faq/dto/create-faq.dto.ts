import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateFaqDto {
  @ApiProperty({ example: 'How do I reset my password?' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    example: 'Go to the login page and click "Forgot Password".',
  })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  answer: string;
}