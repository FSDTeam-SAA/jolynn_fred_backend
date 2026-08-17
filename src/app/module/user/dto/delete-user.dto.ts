import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

const trimReason = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class DeleteUserDto {
  @ApiPropertyOptional({
    example: 'Business information did not meet our platform requirements.',
  })
  @Transform(trimReason)
  @IsOptional()
  @IsString()
  reason?: string;
}
