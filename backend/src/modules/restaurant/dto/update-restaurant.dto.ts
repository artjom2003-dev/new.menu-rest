import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateRestaurantDto } from './create-restaurant.dto';

export type RestaurantStatus = 'draft' | 'published' | 'archived' | 'closed';

export class UpdateRestaurantDto extends PartialType(CreateRestaurantDto) {
  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived', 'closed'] })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived', 'closed'])
  status?: RestaurantStatus;
}
