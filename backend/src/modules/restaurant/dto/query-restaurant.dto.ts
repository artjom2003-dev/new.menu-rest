import { IsOptional, IsString, IsInt, IsNumber, Min, Max, IsEnum, IsBooleanString } from 'class-validator';
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

  @ApiPropertyOptional({ example: 'true', description: 'Only restaurants that have menu dishes' })
  @IsOptional()
  @IsBooleanString()
  hasMenu?: string;

  @ApiPropertyOptional({ example: 'Арбатская', description: 'Metro station name' })
  @IsOptional()
  @IsString()
  metro?: string;

  @ApiPropertyOptional({ example: 'arbat', description: 'District slug' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: 'restaurant', description: 'Venue type (restaurant, cafe, bar, etc.)' })
  @IsOptional()
  @IsString()
  venueType?: string;

  @ApiPropertyOptional({ example: 55.7558, description: 'User latitude for nearby sorting' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 37.6173, description: 'User longitude for nearby sorting' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: 5, description: 'Max radius in km (default 10)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(50)
  radius?: number;
}
