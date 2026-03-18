import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from '@database/entities/restaurant.entity';
import { WorkingHours } from '@database/entities/working-hours.entity';
import { Photo } from '@database/entities/photo.entity';
import { Cuisine } from '@database/entities/cuisine.entity';
import { City } from '@database/entities/city.entity';
import { Feature } from '@database/entities/feature.entity';
import { Allergen } from '@database/entities/allergen.entity';
import { RestaurantChain } from '@database/entities/restaurant-chain.entity';
import { RestaurantDish } from '@database/entities/restaurant-dish.entity';
import { District } from '@database/entities/district.entity';
import { RestaurantLocation } from '@database/entities/restaurant-location.entity';
import { SearchModule } from '@modules/search/search.module';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { ReferenceController } from './reference.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Restaurant, WorkingHours, Photo, Cuisine, City,
      Feature, Allergen, RestaurantChain, RestaurantDish,
      District, RestaurantLocation,
    ]),
    forwardRef(() => SearchModule),
  ],
  controllers: [RestaurantController, ReferenceController],
  providers: [RestaurantService],
  exports: [RestaurantService],
})
export class RestaurantModule {}
