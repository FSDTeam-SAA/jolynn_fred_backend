import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateReportDto {
  @ApiProperty({ example: '6a4de4d04872d2c3ff216b44' })
  @IsMongoId({ message: 'Valid serviceId is required' })
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({
    example: 'This service was never delivered as described...',
  })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  message: string;
}