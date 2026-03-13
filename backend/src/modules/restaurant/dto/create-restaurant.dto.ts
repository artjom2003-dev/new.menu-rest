import {
  IsString, IsNotEmpty, IsOptional, IsInt, Min, Max,
  IsBoolean, MaxLength, IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Il Forno' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  cityId?: number;

  @ApiPropertyOptional({ example: 'ул. Тверская, 15' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ example: 'Тверская' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  metroStation?: string;

  @ApiPropertyOptional({ example: 2, description: '1=₽, 2=₽₽, 3=₽₽₽, 4=₽₽₽₽' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  priceLevel?: number;

  @ApiPropertyOptional({ example: 2000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  averageBill?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasWifi?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasDelivery?: boolean;

  @ApiPropertyOptional({ example: [1, 3], description: 'IDs кухонь' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  cuisineIds?: number[];
}
