import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantRequest } from '@database/entities/restaurant-request.entity';
import { RestaurantRequestController } from './restaurant-request.controller';
import { RestaurantRequestService } from './restaurant-request.service';

@Module({
  imports: [TypeOrmModule.forFeature([RestaurantRequest])],
  controllers: [RestaurantRequestController],
  providers: [RestaurantRequestService],
  exports: [RestaurantRequestService],
})
export class RestaurantRequestModule {}
