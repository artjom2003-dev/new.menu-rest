import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cuisine } from '@database/entities/cuisine.entity';
import { City } from '@database/entities/city.entity';
import { Feature } from '@database/entities/feature.entity';
import { Allergen } from '@database/entities/allergen.entity';
import { Restaurant } from '@database/entities/restaurant.entity';
import { District } from '@database/entities/district.entity';

@ApiTags('reference')
@Controller()
export class ReferenceController {
  constructor(
    @InjectRepository(Cuisine) private readonly cuisineRepo: Repository<Cuisine>,
    @InjectRepository(City) private readonly cityRepo: Repository<City>,
    @InjectRepository(Feature) private readonly featureRepo: Repository<Feature>,
    @InjectRepository(Allergen) private readonly allergenRepo: Repository<Allergen>,
    @InjectRepository(Restaurant) private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(District) private readonly districtRepo: Repository<District>,
  ) {}

  @Get('cuisines')
  @ApiOperation({ summary: 'Список национальных кухонь' })
  async getCuisines() {
    // After cleanup, cuisines table contains only national/regional cuisines
    return this.cuisineRepo.find({ order: { name: 'ASC' } });
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

  @Get('venue-types')
  @ApiOperation({ summary: 'Список типов заведений' })
  async getVenueTypes() {
    const LABELS: Record<string, string> = {
      'restaurant': 'Ресторан',
      'cafe': 'Кафе',
      'bar': 'Бар',
      'pub': 'Паб',
      'coffeehouse': 'Кофейня',
      'bakery': 'Пекарня',
      'canteen': 'Столовая',
      'fastfood': 'Фастфуд',
      'steakhouse': 'Стейкхаус',
      'gastropub': 'Гастропаб',
      'gastrobar': 'Гастробар',
      'bistro': 'Бистро',
      'pizzeria': 'Пиццерия',
      'sushi-bar': 'Суши-бар',
      'lounge': 'Лаунж',
      'wine-bar': 'Винный бар',
      'sport-bar': 'Спорт-бар',
      'teahouse': 'Чайхана',
      'tavern': 'Трактир',
      'confectionery': 'Кондитерская',
      'hookah-lounge': 'Кальянная',
      'shashlik-house': 'Шашлычная',
    };
    const rows = await this.restaurantRepo
      .createQueryBuilder('r')
      .select('r.venue_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('r.venue_type IS NOT NULL')
      .groupBy('r.venue_type')
      .having('COUNT(*) >= 5')
      .orderBy('count', 'DESC')
      .getRawMany();
    return rows.map(r => ({
      slug: r.type,
      name: LABELS[r.type] || r.type,
      count: Number(r.count),
    }));
  }

  @Get('metro-stations')
  @ApiOperation({ summary: 'Список станций метро для города' })
  @ApiQuery({ name: 'city', required: true, example: 'moscow' })
  async getMetroStations(@Query('city') citySlug: string) {
    if (!citySlug) return [];
    const rows = await this.restaurantRepo
      .createQueryBuilder('r')
      .select('r.metro_station', 'station')
      .addSelect('COUNT(*)', 'cnt')
      .innerJoin('r.city', 'city')
      .where('city.slug = :citySlug', { citySlug })
      .andWhere('r.metro_station IS NOT NULL')
      .andWhere("r.metro_station != ''")
      .groupBy('r.metro_station')
      .having('COUNT(*) >= 3')
      .orderBy('r.metro_station', 'ASC')
      .getRawMany();
    // Filter out garbage: valid metro stations start with uppercase Cyrillic/Latin,
    // max 4 words, max 35 chars, no sentences
    const validStation = /^[А-ЯЁA-Z][а-яёА-ЯЁa-zA-Z0-9\s\-\.]+$/;
    const blacklist = /меню|кухн|кулинар|ресторан|бренд|порц|обеща|кроме|впрочем|кстати|главное|здесь|место|тут нет|огромн|используют|блюда|чаи$|краб|бар[ыу]?\b/i;
    return rows
      .filter(r => {
        const s = r.station;
        return s.length <= 35
          && s.split(/\s+/).length <= 4
          && validStation.test(s)
          && !blacklist.test(s);
      })
      .map(r => ({ name: r.station, count: Number(r.cnt) }));
  }

  @Get('districts')
  @ApiOperation({ summary: 'Список районов для города' })
  @ApiQuery({ name: 'city', required: true, example: 'moscow' })
  async getDistricts(@Query('city') citySlug: string) {
    if (!citySlug) return [];
    const city = await this.cityRepo.findOneBy({ slug: citySlug });
    if (!city) return [];
    // Get districts with restaurant counts
    const rows: Array<{ id: number; name: string; slug: string; cnt: string }> = await this.districtRepo
      .createQueryBuilder('d')
      .select(['d.id as id', 'd.name as name', 'd.slug as slug'])
      .addSelect('COUNT(rl.id)', 'cnt')
      .leftJoin('restaurant_locations', 'rl', 'rl.district_id = d.id')
      .where('d.city_id = :cityId', { cityId: city.id })
      .groupBy('d.id')
      .orderBy('d.name', 'ASC')
      .getRawMany();
    // Deduplicate: "район Арбат" / "Арбат" / "Академический район" / "Академический"
    // Keep the variant with more restaurants, show clean name
    const seen = new Map<string, { id: number; name: string; slug: string; cnt: number }>();
    for (const d of rows) {
      const base = d.name
        .replace(/^район\s+/i, '')
        .replace(/\s+район$/i, '')
        .trim();
      const cnt = Number(d.cnt);
      const existing = seen.get(base);
      if (!existing || cnt > existing.cnt) {
        seen.set(base, { id: d.id, name: base, slug: d.slug, cnt });
      }
    }
    // Only return districts that actually have restaurants
    return Array.from(seen.values())
      .filter(d => d.cnt > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      .map(d => ({ id: d.id, name: d.name, slug: d.slug }));
  }
}
