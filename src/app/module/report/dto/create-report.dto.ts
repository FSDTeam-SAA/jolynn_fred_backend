import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateReportDto {
  @ApiProperty({ example: '6a4dd687ae2791392abdd152' })
  @IsMongoId({ message: 'Valid ownerId is required' })
  @IsNotEmpty()
  ownerId: string;

  @ApiProperty({
    example: 'This business owner never delivered as promised...',
  })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  message: string;
}
