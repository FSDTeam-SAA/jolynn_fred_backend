import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class GetStatesQueryDto {
  @ApiPropertyOptional({
    example: 'US',
    description: 'Country code for filtering states',
  })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({
    example: 'ala',
    description: 'Search states by name or code',
  })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  searchTerm?: string;
}

export class GetCitiesByStateQueryDto {
  @ApiPropertyOptional({
    example: 'United States',
    description: 'Country name used to locate the city source document',
  })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  countryName?: string;

  @ApiPropertyOptional({
    example: 'bir',
    description: 'Search cities by name',
  })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  searchTerm?: string;

  @ApiPropertyOptional({
    example: 100,
    description: 'Maximum number of cities to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
