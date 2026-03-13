import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantDish } from '@database/entities/restaurant-dish.entity';
import { BudgetCalcController } from './budget-calc.controller';
import { BudgetCalcService } from './budget-calc.service';

@Module({
  imports: [TypeOrmModule.forFeature([RestaurantDish])],
  controllers: [BudgetCalcController],
  providers: [BudgetCalcService],
})
export class BudgetCalcModule {}
