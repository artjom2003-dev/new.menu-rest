import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from '@database/entities/restaurant.entity';
import { User } from '@database/entities/user.entity';
import { Review } from '@database/entities/review.entity';
import { Booking } from '@database/entities/booking.entity';
import { Article } from '@database/entities/article.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Restaurant, User, Review, Booking, Article]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
