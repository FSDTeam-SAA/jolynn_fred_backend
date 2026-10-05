import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class UpdateReferralEmailDto {
  @ApiProperty({ example: 'corrected@acme.example' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Valid business email is required' })
  businessEmail: string;
}
