import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '@database/entities/booking.entity';
import { LoyaltyModule } from '@modules/loyalty/loyalty.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking]),
    LoyaltyModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
