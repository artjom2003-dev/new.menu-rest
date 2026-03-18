import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';

export class CreateRestaurantRequestDto {
  @ApiProperty({ example: 'Ресторан «У Патрика»' })
  @IsString()
  @MaxLength(200)
  restaurantName: string;

  @ApiProperty({ example: 'Москва' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'ул. Примерная, 1' })
  @IsString()
  @MaxLength(300)
  address: string;

  @ApiProperty({ example: 'Иван Петров' })
  @IsString()
  @MaxLength(100)
  contactName: string;

  @ApiProperty({ example: '+7 999 123-45-67' })
  @IsString()
  @MaxLength(30)
  contactPhone: string;

  @ApiProperty({ example: 'ivan@restaurant.ru' })
  @IsEmail()
  @MaxLength(200)
  contactEmail: string;

  @ApiPropertyOptional({ example: 'https://myrestaurant.ru' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional({ example: 'Итальянская кухня, 60 посадочных мест' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
