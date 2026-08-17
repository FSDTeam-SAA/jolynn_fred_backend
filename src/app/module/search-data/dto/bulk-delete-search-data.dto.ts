import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId, ArrayNotEmpty } from 'class-validator';

export class BulkDeleteSearchDataDto {
  @ApiProperty({ type: [String], example: ['65f1a2b3c4d5e6f789012345'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  ids: string[];
}
