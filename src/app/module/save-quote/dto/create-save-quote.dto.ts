import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class CreateSaveQuoteDto {
  @ApiProperty({
    example: '6864d80f21b7a4c1b0ef4f10',
    description: 'Business owner user id to save',
  })
  @IsMongoId()
  businessOwnerId: string;
}
