import { Controller, Post, Body, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BudgetCalcService, BudgetCalcRequest } from './budget-calc.service';

@ApiTags('budget-calc')
@Controller('budget-calc')
export class BudgetCalcController {
  constructor(private readonly service: BudgetCalcService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Рассчитать стоимость выбранных блюд' })
  calculate(@Body() dto: BudgetCalcRequest) {
    return this.service.calculate(dto);
  }

  @Get('estimate')
  @ApiOperation({ summary: 'Подобрать блюда под бюджет' })
  @ApiQuery({ name: 'restaurantId', type: Number })
  @ApiQuery({ name: 'budget', description: 'Бюджет на человека (копейки)', type: Number })
  @ApiQuery({ name: 'guests', required: false, type: Number })
  estimate(
    @Query('restaurantId', ParseIntPipe) restaurantId: number,
    @Query('budget', ParseIntPipe) budget: number,
    @Query('guests', new DefaultValuePipe(1), ParseIntPipe) guests: number,
  ) {
    return this.service.estimateByBudget(restaurantId, budget, guests);
  }
}
