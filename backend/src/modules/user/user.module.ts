import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@database/entities/user.entity';
import { Restaurant } from '@database/entities/restaurant.entity';
import { Article } from '@database/entities/article.entity';
import { Listing } from '@database/entities/listing.entity';
import { WorkingHours } from '@database/entities/working-hours.entity';
import { Feature } from '@database/entities/feature.entity';
import { Dish } from '@database/entities/dish.entity';
import { RestaurantDish } from '@database/entities/restaurant-dish.entity';
import { UserController } from './user.controller';
import { UserPublicController, RestaurantWishlistController, ListingPublicController } from './user-public.controller';
import { UserService } from './user.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Restaurant, Article, Listing, WorkingHours, Feature, Dish, RestaurantDish])],
  controllers: [UserController, UserPublicController, RestaurantWishlistController, ListingPublicController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
