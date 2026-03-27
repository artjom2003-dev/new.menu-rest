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

    // Junk patterns: non-food items that sneak into menus from scraping
    const JUNK_PATTERNS = /^(наши\s+соцсет|абонемент|программа\s+лояльности|обновлённое\s+меню|обновленное\s+меню|возьмите\s+с\s+собой|скачай|кешбэк|кэшбэк|cashback|qr[\s-]?код|реферал|промокод|бонусн\w+\s+покупк|наши\s+акци|пароль\s+wi|без\s+приборов|приборы$|детские\s+палочки|^палочки$|салфетк\w*\s+влажн|контейнер\s+для|упаковк|^меню$|^меню\s*🧾|^главная$|^каталог$|^каталог\s+(продукции|товаров)|^ещё$|^другое$|^назад$|^далее$|^подробнее$|^перейти$|^показать$|ssl[\s‑-]?сертификат|vip[\s-]?тариф|упаковка\s+бренда|хостинг)/i;
    const JUNK_CERT_PATTERN = /^(сертификат|подарочн\w+\s+(сертификат|набор|карт)|(карта|сертификат)\s+\d+\s*руб|влажн\w+\s+салфетк|салфетк\w+.*\d+\s*шт)/i;
    // Standalone city names, delivery/logistics junk
    const JUNK_CITY_DELIVERY = /^(москва|санкт-петербург|екатеринбург|краснодар|ростов-на-дону|тюмень|воронеж|волгоград|сочи|новосибирск|казань|самара|нижний новгород|красноярск|пермь|уфа|челябинск|омск)$/i;
    const JUNK_DELIVERY = /^(доставка|самовывоз|дождитесь\s+курьер|курьер|оплат\w+\s+онлайн|способ\s+оплат)/i;

    // Filter out junk: no name, non-food items, zero-price duplicates
    const seen = new Map<string, boolean>(); // track name+price to remove dupes
    const valid = items.filter(i => {
      const name = i.dish?.name?.trim();
      if (!name || name.length === 0) return false;
      if (JUNK_PATTERNS.test(name)) return false;
      if (JUNK_CERT_PATTERN.test(name)) return false;
      if (JUNK_CITY_DELIVERY.test(name)) return false;
      if (JUNK_DELIVERY.test(name)) return false;
      // Filter URLs, domains, garbled text
      if (/www\.|https?:|\.ru\s*$|\.com\s*$|@/.test(name)) return false;
      if (/[<>{}\\|]/.test(name)) return false; // HTML/code garbage
      // Deduplicate: keep first occurrence with price, skip zero-price dupes
      const key = name.toLowerCase();
      const price = i.price || 0;
      if (seen.has(key)) {
        if (price === 0) return false; // zero-price duplicate
        return true; // different price variant is ok
      }
      seen.set(key, true);
      return true;
    });

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
