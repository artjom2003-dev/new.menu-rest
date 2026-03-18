import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dish } from '@database/entities/dish.entity';
import { RestaurantDish } from '@database/entities/restaurant-dish.entity';

export class CreateRestaurantDishDto {
  dishId: number;
  categoryName?: string;
  price: number; // в копейках
  isAvailable?: boolean;
  sortOrder?: number;
}

export class UpdateRestaurantDishDto {
  categoryName?: string;
  price?: number;
  isAvailable?: boolean;
  sortOrder?: number;
}

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Dish)
    private readonly dishRepo: Repository<Dish>,
    @InjectRepository(RestaurantDish)
    private readonly restaurantDishRepo: Repository<RestaurantDish>,
  ) {}

  async getFullMenu(restaurantId: number) {
    const items = await this.restaurantDishRepo.find({
      where: { restaurantId, isAvailable: true },
      relations: ['dish', 'dish.allergens'],
      order: { sortOrder: 'ASC' },
    });

    // Group by categoryName
    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
      const cat = item.categoryName ?? 'Без категории';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    return Object.entries(grouped).map(([category, dishes]) => ({ category, dishes }));
  }

  async addDishToRestaurant(restaurantId: number, dto: CreateRestaurantDishDto): Promise<RestaurantDish> {
    const dish = await this.dishRepo.findOneBy({ id: dto.dishId });
    if (!dish) throw new NotFoundException(`Блюдо #${dto.dishId} не найдено`);

    const entry = this.restaurantDishRepo.create({ ...dto, restaurantId });
    return this.restaurantDishRepo.save(entry);
  }

  async updateRestaurantDish(id: number, dto: UpdateRestaurantDishDto): Promise<RestaurantDish> {
    const entry = await this.restaurantDishRepo.findOneBy({ id });
    if (!entry) throw new NotFoundException(`Запись меню #${id} не найдена`);
    Object.assign(entry, dto);
    return this.restaurantDishRepo.save(entry);
  }

  async removeDishFromRestaurant(id: number): Promise<void> {
    const entry = await this.restaurantDishRepo.findOneBy({ id });
    if (!entry) throw new NotFoundException(`Запись меню #${id} не найдена`);
    await this.restaurantDishRepo.remove(entry);
  }
}
