import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsInt, IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { Dish } from '@database/entities/dish.entity';
import { RestaurantDish } from '@database/entities/restaurant-dish.entity';

export class CreateRestaurantDishDto {
  @IsInt()
  dishId: number;

  @IsOptional() @IsString()
  categoryName?: string;

  @IsInt()
  price: number; // в копейках

  @IsOptional() @IsBoolean()
  isAvailable?: boolean;

  @IsOptional() @IsInt()
  sortOrder?: number;
}

export class CreateDishFullDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  composition?: string;

  @IsOptional() @IsString()
  categoryName?: string;

  @IsInt()
  price: number;

  @IsOptional() @IsNumber()
  weightGrams?: number;

  @IsOptional() @IsNumber()
  volumeMl?: number;

  @IsOptional() @IsNumber()
  calories?: number;

  @IsOptional() @IsNumber()
  protein?: number;

  @IsOptional() @IsNumber()
  fat?: number;

  @IsOptional() @IsNumber()
  carbs?: number;
}

export class UpdateRestaurantDishDto {
  @IsOptional() @IsString()
  categoryName?: string;

  @IsOptional() @IsInt()
  price?: number;

  @IsOptional() @IsBoolean()
  isAvailable?: boolean;

  @IsOptional() @IsInt()
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

    // Filter out junk: dishes without a proper name
    const valid = items.filter(i => i.dish?.name && i.dish.name.trim().length > 0);

    // If fewer than 5 valid dishes, don't show menu at all
    if (valid.length < 5) return [];

    // Fix broken categories: if categoryName == dish name, it's not a real category
    for (const item of valid) {
      const cat = (item.categoryName ?? '').trim();
      const name = (item.dish?.name ?? '').trim();
      if (cat && name && cat === name) {
        item.categoryName = null;
      }
    }

    // Group by categoryName
    const grouped: Record<string, typeof valid> = {};
    for (const item of valid) {
      const cat = item.categoryName ?? 'Основное меню';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    // Merge tiny categories (1-2 items) into "Основное меню"
    const MERGE_THRESHOLD = 2;
    const merged = grouped['Основное меню'] || [];
    for (const [cat, dishes] of Object.entries(grouped)) {
      if (cat === 'Основное меню') continue;
      if (dishes.length <= MERGE_THRESHOLD) {
        merged.push(...dishes);
        delete grouped[cat];
      }
    }
    if (merged.length > 0) {
      grouped['Основное меню'] = merged;
    }

    return Object.entries(grouped).map(([category, dishes]) => ({ category, dishes }));
  }

  async createDishFull(restaurantId: number, dto: CreateDishFullDto): Promise<RestaurantDish> {
    const dish = this.dishRepo.create({
      name: dto.name,
      description: dto.description || null,
      composition: dto.composition || null,
      weightGrams: dto.weightGrams || null,
      volumeMl: dto.volumeMl || null,
      calories: dto.calories || null,
      protein: dto.protein || null,
      fat: dto.fat || null,
      carbs: dto.carbs || null,
    });
    const savedDish = await this.dishRepo.save(dish);

    const entry = this.restaurantDishRepo.create({
      restaurantId,
      dishId: savedDish.id,
      categoryName: dto.categoryName || 'Основное меню',
      price: dto.price,
      isAvailable: true,
    });
    const savedEntry = await this.restaurantDishRepo.save(entry);
    savedEntry.dish = savedDish;
    return savedEntry;
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
