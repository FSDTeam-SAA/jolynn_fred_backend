import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const normalizeString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateReviewDto {
  @ApiProperty({ example: '6871aa22bb33cc44dd55ee66' })
  @Transform(normalizeString)
  @IsMongoId({ message: 'Valid business id is required' })
  businessId: string;

  @ApiProperty({ example: 5 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    example:
      'Excellent work, clear communication, and the final result was very professional.',
  })
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1500)
  message: string;

  @ApiPropertyOptional({
    description: 'Review photo URL or field for uploaded photo',
    example: 'https://res.cloudinary.com/...',
  })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({
    description: 'Multiple review photos URLs',
    type: [String],
  })
  @IsOptional()
  photos?: string[];
}
