import { IsInt, IsString, IsOptional, IsDateString, Min, Max, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  restaurantId: number;

  @ApiProperty({ example: '2025-03-15' })
  @IsDateString()
  bookingDate: string;

  @ApiProperty({ example: '19:00' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Формат времени: HH:MM' })
  bookingTime: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  guestsCount: number;

  @ApiProperty({ example: 'Иван Иванов' })
  @IsString()
  contactName: string;

  @ApiProperty({ example: '+7 999 123-45-67' })
  @IsString()
  contactPhone: string;

  @ApiPropertyOptional({ example: 'Столик у окна, пожалуйста' })
  @IsOptional()
  @IsString()
  comment?: string;
}
