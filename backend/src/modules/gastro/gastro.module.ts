import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTasteProfile } from '@database/entities/user-taste-profile.entity';
import { RestaurantTasteVector } from '@database/entities/restaurant-taste-vector.entity';
import { DishTasteVector } from '@database/entities/dish-taste-vector.entity';
import { Restaurant } from '@database/entities/restaurant.entity';
import { GastroController } from './gastro.controller';
import { GastroService } from './gastro.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserTasteProfile,
      RestaurantTasteVector,
      DishTasteVector,
      Restaurant,
    ]),
  ],
  controllers: [GastroController],
  providers: [GastroService],
  exports: [GastroService],
})
export class GastroModule {}
