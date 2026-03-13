import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MenuService, CreateRestaurantDishDto, UpdateRestaurantDishDto } from './menu.service';

@ApiTags('menu')
@Controller('restaurants/:restaurantId/menu')
export class MenuController {
  constructor(private readonly service: MenuService) {}

  @Get()
  @ApiOperation({ summary: 'Меню ресторана по категориям' })
  getMenu(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.service.getFullMenu(restaurantId);
  }

  @Post('dishes')
  @ApiOperation({ summary: 'Добавить блюдо в меню ресторана' })
  addDish(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: CreateRestaurantDishDto,
  ) {
    return this.service.addDishToRestaurant(restaurantId, dto);
  }

  @Patch('dishes/:id')
  @ApiOperation({ summary: 'Обновить позицию меню' })
  updateDish(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestaurantDishDto,
  ) {
    return this.service.updateRestaurantDish(id, dto);
  }

  @Delete('dishes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Убрать блюдо из меню ресторана' })
  removeDish(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeDishFromRestaurant(id);
  }
}
