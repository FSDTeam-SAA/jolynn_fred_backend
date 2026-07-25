import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

const emptyStringToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : typeof value === 'string' ? value.trim() : value;

export class UpdateServiceCategoryStatusDto {
  @ApiProperty({
    enum: ['approved', 'rejected'],
    example: 'approved',
  })
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 'This category already belongs under HVAC.' })
  @IsOptional()
  @Transform(emptyStringToUndefined)
  @IsString()
  rejectionReason?: string;
}
