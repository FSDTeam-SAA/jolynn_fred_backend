import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

const trimReason = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class DeleteUserDto {
  @ApiPropertyOptional({
    enum: ['user', 'businessOwner', 'all'],
    description:
      'Profile to delete. Required when the target account has both profiles. Pass all to completely delete the account and all profiles.',
  })
  @IsOptional()
  @IsIn(['user', 'businessOwner', 'all'])
  profileRole?: 'user' | 'businessOwner' | 'all';

  @ApiPropertyOptional({
    example: 'Business information did not meet our platform requirements.',
  })
  @Transform(trimReason)
  @IsOptional()
  @IsString()
  reason?: string;
}
