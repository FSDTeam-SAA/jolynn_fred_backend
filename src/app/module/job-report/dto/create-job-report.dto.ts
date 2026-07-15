import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateJobReportDto {
  @ApiProperty({ example: '6a4de4d04872d2c3ff216b44' })
  @IsMongoId({ message: 'Valid helpWantedId is required' })
  @IsNotEmpty()
  helpWantedId: string;

  @ApiPropertyOptional({ example: 'reporter@example.com' })
  @IsOptional()
  @Transform(normalizeString)
  @IsEmail({}, { message: 'Valid email is required' })
  reporterEmail?: string;

  @ApiProperty({ example: 'This post looks like spam / scam content.' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  message: string;
}