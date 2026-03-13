import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cuisine } from '@database/entities/cuisine.entity';
import { City } from '@database/entities/city.entity';
import { Feature } from '@database/entities/feature.entity';
import { Allergen } from '@database/entities/allergen.entity';

@ApiTags('reference')
@Controller()
export class ReferenceController {
  constructor(
    @InjectRepository(Cuisine) private readonly cuisineRepo: Repository<Cuisine>,
    @InjectRepository(City) private readonly cityRepo: Repository<City>,
    @InjectRepository(Feature) private readonly featureRepo: Repository<Feature>,
    @InjectRepository(Allergen) private readonly allergenRepo: Repository<Allergen>,
  ) {}

  @Get('cuisines')
  @ApiOperation({ summary: 'Список кухонь' })
  async getCuisines() {
    const all = await this.cuisineRepo.find({ order: { name: 'ASC' } });
    // Only national/regional cuisine types, no dishes or food categories
    const exclude = new Set([
      'морепродукты', 'пицца', 'стейки', 'стейкхаус', 'суши',
      'вегетарианская', 'фьюжн', 'авторская', 'восточная', 'азиатская',
      'смешанная',
    ]);
    const seen = new Set<string>();
    return all.filter(c => {
      if (!/^[A-ZА-ЯЁ]/.test(c.name)) return false;
      const key = c.name.toLowerCase();
      if (exclude.has(key)) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  @Get('cities')
  @ApiOperation({ summary: 'Список городов' })
  getCities() {
    return this.cityRepo.find({ order: { name: 'ASC' } });
  }

  @Get('features')
  @ApiOperation({ summary: 'Список фич/особенностей' })
  @ApiQuery({ name: 'category', required: false, example: 'atmosphere' })
  getFeatures(@Query('category') category?: string) {
    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    return this.featureRepo.find({ where, order: { category: 'ASC', name: 'ASC' } });
  }

  @Get('allergens')
  @ApiOperation({ summary: 'Список аллергенов' })
  getAllergens() {
    return this.allergenRepo.find({ order: { name: 'ASC' } });
  }
}
