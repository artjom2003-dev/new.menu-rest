import { IsString, IsOptional, IsArray, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArticleDto {
  @ApiProperty({ example: 'Лучшие рестораны Москвы 2025' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Обзор лучших заведений столицы...' })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiProperty({ example: '<h2>Введение</h2><p>...</p>' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/cover.jpg' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ example: 'Лучшие рестораны Москвы — гид 2025' })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiPropertyOptional({ example: [1, 5, 12], description: 'ID ресторанов, упоминаемых в статье' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  restaurantIds?: number[];
}

export class UpdateArticleDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
  @IsOptional() @IsString() status?: 'draft' | 'published' | 'archived';
  @IsOptional() @IsArray() @IsInt({ each: true }) restaurantIds?: number[];
}
