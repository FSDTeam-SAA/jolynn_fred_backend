import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

const trimReason = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class DeleteUserDto {
  @ApiPropertyOptional({
    enum: ['user', 'businessOwner'],
    description:
      'Profile to delete. Required when the target account has both profiles.',
  })
  @IsOptional()
  @IsIn(['user', 'businessOwner'])
  profileRole?: 'user' | 'businessOwner';

  @ApiPropertyOptional({
    example: 'Business information did not meet our platform requirements.',
  })
  @Transform(trimReason)
  @IsOptional()
  @IsString()
  reason?: string;
}
