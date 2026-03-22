import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from '@database/entities/review.entity';
import { RestaurantModule } from '@modules/restaurant/restaurant.module';
import { LoyaltyModule } from '@modules/loyalty/loyalty.module';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review]),
    RestaurantModule,
    LoyaltyModule,
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
