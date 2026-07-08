import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateContactDto {
  @ApiProperty({ example: 'John' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john@example.com' })
  @Transform(normalizeString)
  @IsEmail({}, { message: 'Valid email is required' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+12345678901' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'I would like more information about...' })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  message: string;
}