import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryRestaurantDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'moscow' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'italian' })
  @IsOptional()
  @IsString()
  cuisine?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  priceLevel?: number;

  @ApiPropertyOptional({ example: 1, description: 'Min price level (1-4)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  priceLevelMin?: number;

  @ApiPropertyOptional({ example: 3, description: 'Max price level (1-4)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  priceLevelMax?: number;

  @ApiPropertyOptional({ enum: ['rating', 'created_at', 'name'] })
  @IsOptional()
  @IsEnum(['rating', 'created_at', 'name'])
  sortBy?: 'rating' | 'created_at' | 'name' = 'rating';

  @ApiPropertyOptional({ example: 'суши' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'romantic,birthday', description: 'Comma-separated feature slugs' })
  @IsOptional()
  @IsString()
  features?: string;

  @ApiPropertyOptional({ example: 'published' })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived', 'closed'])
  status?: string = 'published';
}
