import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RestaurantDish } from '@database/entities/restaurant-dish.entity';

export interface BudgetCalcRequest {
  restaurantId: number;
  dishIds: number[];       // restaurant_dish IDs
  guestsCount: number;
  tipPercent?: number;     // 0-30, default 10
}

export interface BudgetCalcResult {
  dishes: Array<{
    id: number;
    name: string;
    price: number;           // в копейках
  }>;
  subtotal: number;          // в копейках
  tipAmount: number;
  total: number;
  perPerson: number;
  guestsCount: number;
  tipPercent: number;
}

@Injectable()
export class BudgetCalcService {
  constructor(
    @InjectRepository(RestaurantDish)
    private readonly rdRepo: Repository<RestaurantDish>,
  ) {}

  async calculate(req: BudgetCalcRequest): Promise<BudgetCalcResult> {
    const tipPercent = req.tipPercent ?? 10;
    const guests = Math.max(1, req.guestsCount);

    const items = await this.rdRepo.find({
      where: {
        id: In(req.dishIds),
        restaurantId: req.restaurantId,
        isAvailable: true,
      },
      relations: ['dish'],
    });

    if (items.length === 0) {
      throw new NotFoundException('Выбранные блюда не найдены в меню ресторана');
    }

    const dishes = items.map((rd) => ({
      id: rd.id,
      name: rd.dish.name,
      price: rd.price,
    }));

    const subtotal = dishes.reduce((sum, d) => sum + d.price, 0);
    const tipAmount = Math.round(subtotal * (tipPercent / 100));
    const total = subtotal + tipAmount;
    const perPerson = Math.round(total / guests);

    return { dishes, subtotal, tipAmount, total, perPerson, guestsCount: guests, tipPercent };
  }

  async estimateByBudget(restaurantId: number, budgetPerPerson: number, guestsCount: number) {
    const totalBudget = budgetPerPerson * Math.max(1, guestsCount);

    const items = await this.rdRepo.find({
      where: { restaurantId, isAvailable: true },
      relations: ['dish'],
      order: { price: 'ASC' },
    });

    // Жадный алгоритм: от дешёвых к дорогим, пока укладываемся в бюджет
    const selected: typeof items = [];
    let spent = 0;

    for (const item of items) {
      if (spent + item.price <= totalBudget) {
        selected.push(item);
        spent += item.price;
      }
    }

    return {
      dishes: selected.map((rd) => ({
        id: rd.id,
        name: rd.dish.name,
        categoryName: rd.categoryName,
        price: rd.price,
      })),
      total: spent,
      remaining: totalBudget - spent,
      budgetPerPerson,
      guestsCount,
    };
  }
}
