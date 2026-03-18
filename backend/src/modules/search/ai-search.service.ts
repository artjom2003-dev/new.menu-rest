import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '@database/entities/restaurant.entity';
import { extractKeywords, ExtractedParams } from './keyword-extractor';
import Redis from 'ioredis';

export interface AiRecommendation {
  recommendation: string;
  restaurants: RestaurantSummary[];
  params: ExtractedParams;
  source: string;
}

export interface RestaurantSummary {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  address: string | null;
  metroStation: string | null;
  cuisines: string[];
  features: string[];
  rating: number;
  reviewCount: number;
  averageBill: number | null;
  priceLevel: number | null;
  venueType: string | null;
  phone: string | null;
  website: string | null;
  photos: { url: string; isCover: boolean }[];
  dishes: { name: string; price: number | null }[];
  workingHours: { day: number; open: string | null; close: string | null }[];
  lat: number | null;
  lng: number | null;
  distanceKm?: number;
}

@Injectable()
export class AiSearchService {
  private readonly logger = new Logger(AiSearchService.name);
  private readonly ollamaUrl: string | null;
  private readonly ollamaModel: string;
  private redis: Redis | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
  ) {
    const url = config.get<string>('OLLAMA_URL');
    this.ollamaUrl = url || null;
    this.ollamaModel = config.get('OLLAMA_MODEL', 'gemma3:12b');

    if (this.ollamaUrl) {
      this.logger.log(`Ollama LLM: ${this.ollamaUrl} / ${this.ollamaModel}`);
    } else {
      this.logger.warn('OLLAMA_URL не задан — AI-ассистент будет работать без LLM');
    }

    // Redis cache disabled for now — enable when Redis is available
    this.redis = null;
  }

  /**
   * RAG-based AI assistant:
   * 1. Extract keywords from query
   * 2. Search DB for matching restaurants
   * 3. Feed restaurants + query to LLM
   * 4. LLM generates natural language recommendation
   */
  async recommend(query: string): Promise<AiRecommendation> {
    const cacheKey = `ai:rec:${Buffer.from(query.toLowerCase().trim()).toString('base64').slice(0, 64)}`;

    // Check cache (with 2s timeout to avoid hanging if Redis is down)
    if (this.redis) {
      try {
        const cached = await Promise.race([
          this.redis.get(cacheKey),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000)),
        ]);
        if (cached) return JSON.parse(cached);
      } catch {
        this.logger.warn('Redis cache read failed/timeout, proceeding without cache');
      }
    }

    // Step 1: Extract keywords for DB search
    const params = extractKeywords(query);

    // Step 2: Find relevant restaurants from DB (strict → relaxed → broad)
    this.logger.log(`[AI] Step 2: searching DB for "${query}", params: ${JSON.stringify(params)}`);
    let restaurants = await this.findRelevantRestaurants(query, params);
    this.logger.log(`[AI] Strict search: ${restaurants.length} results`);

    // If strict search returned 0, try with relaxed filters
    if (restaurants.length === 0) {
      restaurants = await this.findRelevantRestaurants(query, params, true);
      this.logger.log(`[AI] Relaxed search: ${restaurants.length} results`);
    }

    // If still 0, do broad text search ignoring all extracted params
    if (restaurants.length === 0) {
      restaurants = await this.broadTextSearch(query);
      this.logger.log(`[AI] Broad search: ${restaurants.length} results`);
    }

    // Step 3: Generate LLM recommendation (or fallback)
    this.logger.log(`[AI] Step 3: generating recommendation (ollama=${!!this.ollamaUrl}, count=${restaurants.length})`);
    let recommendation: string;
    if (this.ollamaUrl && restaurants.length > 0) {
      recommendation = await this.generateRecommendation(query, restaurants, params);
      this.logger.log(`[AI] Recommendation generated (${recommendation.length} chars)`);
    } else if (restaurants.length > 0) {
      recommendation = this.buildFallbackRecommendation(query, restaurants);
    } else {
      recommendation = 'К сожалению, по вашему запросу ничего не найдено. Попробуйте изменить запрос или указать другие критерии.';
    }

    const result: AiRecommendation = {
      recommendation,
      restaurants,
      params,
      source: this.ollamaUrl ? 'ai' : 'fallback',
    };

    // Cache result (fire-and-forget with timeout)
    if (this.redis) {
      Promise.race([
        this.redis.setex(cacheKey, this.config.get<number>('AI_CACHE_TTL', 3600), JSON.stringify(result)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000)),
      ]).catch(() => {});
    }

    return result;
  }

  /**
   * Smart DB search: uses extracted params + full-text search fallback
   */
  private async findRelevantRestaurants(query: string, params: ExtractedParams, relaxed = false, userLat?: number, userLng?: number): Promise<RestaurantSummary[]> {
    const qb = this.restaurantRepo
      .createQueryBuilder('r')
      .leftJoin('r.city', 'city')
      .addSelect(['city.name', 'city.slug'])
      .leftJoin('r.cuisines', 'cuisine')
      .addSelect(['cuisine.name', 'cuisine.slug'])
      .leftJoin('r.features', 'feature')
      .addSelect(['feature.name', 'feature.slug'])
      .where('r.status = :status', { status: 'published' });

    let hasFilters = false;
    const wantsNearby = /поблизости|рядом|ближайш|nearby|недалеко/.test(query.toLowerCase());

    // If user has geo coordinates and wants nearby, filter by radius and sort by distance
    if (userLat && userLng && wantsNearby) {
      const radius = 5; // km for "nearby" queries
      qb.andWhere('r.lat IS NOT NULL AND r.lng IS NOT NULL');
      qb.andWhere(
        `(6371 * acos(LEAST(1.0, cos(radians(:userLat)) * cos(radians(r.lat)) * cos(radians(r.lng) - radians(:userLng)) + sin(radians(:userLat)) * sin(radians(r.lat))))) <= :radius`,
        { userLat, userLng, radius },
      );
      hasFilters = true;
    }

    // When a specific dish is detected, don't enforce cuisine as a hard AND filter —
    // the dish search itself is specific enough. Cuisine becomes a soft boost via ORDER BY.
    if (params.cuisine && !params.dish) {
      qb.andWhere('cuisine.slug = :cuisine', { cuisine: params.cuisine });
      hasFilters = true;
    }
    if (params.location) {
      qb.andWhere(
        '(city.slug = :loc OR city.name ILIKE :locLike OR r.metro_station ILIKE :locLike OR r.address ILIKE :locLike)',
        { loc: params.location, locLike: `%${params.location}%` },
      );
      hasFilters = true;
    } else if (params.rawLocation) {
      // Fuzzy location search — stem the words for Russian declension tolerance
      const locWords = params.rawLocation.split(/\s+/).filter(w => w.length > 3);
      const locConditions = locWords.map((_, i) =>
        `(r.metro_station ILIKE :rl${i} OR r.address ILIKE :rl${i} OR city.name ILIKE :rl${i})`
      );
      const locParams: Record<string, string> = {};
      locWords.forEach((w, i) => {
        // Trim 2-3 chars from Russian word endings for declension matching
        const stem = w.length > 6 ? w.slice(0, -3) : w.length > 4 ? w.slice(0, -2) : w;
        locParams[`rl${i}`] = `%${stem}%`;
      });
      if (locConditions.length) {
        qb.andWhere(`(${locConditions.join(' AND ')})`, locParams);
        hasFilters = true;
      }
    }
    if (params.venueType && !relaxed) {
      qb.andWhere('r.venue_type = :venueType', { venueType: params.venueType });
      hasFilters = true;
    }
    if (params.budget?.max) {
      qb.andWhere('r.average_bill <= :maxBill', { maxBill: params.budget.max });
      hasFilters = true;
    }
    // In relaxed mode, skip occasion/atmosphere/dietary to get broader results
    if (!relaxed) {
      if (params.occasion) {
        qb.andWhere('feature.slug = :occasion', { occasion: params.occasion });
        hasFilters = true;
      }
      if (params.atmosphere) {
        qb.andWhere('feature.slug = :atmo', { atmo: params.atmosphere });
        hasFilters = true;
      }
      if (params.dietary?.length) {
        params.dietary.forEach((d, i) => {
          qb.andWhere(
            `EXISTS (SELECT 1 FROM restaurant_features rf JOIN features f ON f.id = rf.feature_id WHERE rf.restaurant_id = r.id AND f.slug = :diet${i})`,
            { [`diet${i}`]: d },
          );
        });
        hasFilters = true;
      }
    }
    if (params.dish) {
      // Simple dish search: single ILIKE in one EXISTS (fast)
      qb.andWhere(
        `EXISTS (SELECT 1 FROM restaurant_dishes rd JOIN dishes d ON d.id = rd.dish_id WHERE rd.restaurant_id = r.id AND d.name ILIKE :dishSearch)`,
        { dishSearch: `%${params.dish}%` },
      );
      hasFilters = true;
    }

    // If no structured filters matched, do a broad text search
    if (!hasFilters) {
      const words = query
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .split(/\s+/)
        .filter(w => w.length > 3);

      if (words.length > 0) {
        const textConditions = words.map((_, i) =>
          `(r.name ILIKE :w${i} OR r.description ILIKE :w${i})`
        ).join(' OR ');
        const textParams: Record<string, string> = {};
        words.forEach((w, i) => { textParams[`w${i}`] = `%${w}%`; });
        qb.andWhere(`(${textConditions})`, textParams);
      }
    }

    // Sorting: prioritize exact dish match, then nearby/distance, then rating
    const addDistanceSort = (primary: boolean) => {
      qb.addSelect(
        `(6371 * acos(LEAST(1.0, cos(radians(${userLat})) * cos(radians(r.lat)) * cos(radians(r.lng) - radians(${userLng})) + sin(radians(${userLat})) * sin(radians(r.lat)))))`,
        'geo_dist',
      );
      if (primary) qb.orderBy('geo_dist', 'ASC');
      else qb.addOrderBy('geo_dist', 'ASC');
    };

    if (params.dish) {
      qb.addSelect(
        `CASE WHEN EXISTS (SELECT 1 FROM restaurant_dishes rd JOIN dishes d ON d.id = rd.dish_id WHERE rd.restaurant_id = r.id AND d.name ILIKE :exactDish) THEN 0 ELSE 1 END`,
        'dish_match',
      );
      qb.setParameter('exactDish', `%${params.dish}%`);
      qb.orderBy('dish_match', 'ASC');

      if (userLat && userLng && wantsNearby) {
        addDistanceSort(false);
      } else {
        qb.addOrderBy('r.rating', 'DESC');
      }
    } else if (userLat && userLng && wantsNearby) {
      addDistanceSort(true);
    } else {
      qb.orderBy('r.rating', 'DESC');
    }
    qb.addOrderBy('r.reviewCount', 'DESC')
      .take(15);

    const items = await qb.getMany();

    // Load dishes separately for found restaurants (much faster than JOIN on full table)
    if (items.length > 0) {
      const ids = items.map(r => r.id);
      const withDishes = await this.restaurantRepo
        .createQueryBuilder('r')
        .leftJoinAndSelect('r.restaurantDishes', 'rd')
        .leftJoinAndSelect('rd.dish', 'd')
        .where('r.id IN (:...ids)', { ids })
        .getMany();
      const dishMap = new Map(withDishes.map(r => [r.id, r.restaurantDishes]));
      for (const item of items) {
        item.restaurantDishes = dishMap.get(item.id) || [];
      }
    }

    return items.map(r => this.mapToSummary(r));
  }

  /**
   * Broad text search: searches description for any query words
   */
  private async broadTextSearch(query: string): Promise<RestaurantSummary[]> {
    const words = query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .split(/\s+/)
      .filter(w => w.length > 3); // Only meaningful words

    if (words.length === 0) return [];

    const qb = this.restaurantRepo
      .createQueryBuilder('r')
      .leftJoin('r.city', 'city')
      .addSelect(['city.name', 'city.slug'])
      .leftJoin('r.cuisines', 'cuisine')
      .addSelect(['cuisine.name', 'cuisine.slug'])
      .leftJoin('r.features', 'feature')
      .addSelect(['feature.name', 'feature.slug'])
      .where('r.status = :status', { status: 'published' });

    // Match ANY word in description, name, metro, or dishes
    const conditions = words.map((_, i) =>
      `(r.description ILIKE :bw${i} OR r.name ILIKE :bw${i} OR r.metro_station ILIKE :bw${i} OR EXISTS (SELECT 1 FROM restaurant_dishes rd JOIN dishes d ON d.id=rd.dish_id WHERE rd.restaurant_id=r.id AND d.name ILIKE :bw${i}))`
    );
    const params: Record<string, string> = {};
    words.forEach((w, i) => { params[`bw${i}`] = `%${w}%`; });
    qb.andWhere(`(${conditions.join(' OR ')})`, params);

    qb.orderBy('r.rating', 'DESC').take(15);

    const items = await qb.getMany();

    return items.map(r => this.mapToSummary(r));
  }

  /** Map DB entity to RestaurantSummary */
  private mapToSummary(r: Restaurant): RestaurantSummary {
    const DAY_NAMES = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      city: r.city?.name || r.city?.slug || null,
      address: r.address,
      metroStation: r.metroStation,
      cuisines: r.cuisines?.map(c => c.name) || [],
      features: r.features?.map(f => f.name) || [],
      rating: Number(r.rating),
      reviewCount: r.reviewCount,
      averageBill: r.averageBill,
      priceLevel: r.priceLevel,
      venueType: r.venueType,
      phone: r.phone,
      website: r.website,
      photos: r.photos?.map(p => ({ url: p.url, isCover: p.isCover })) || [],
      dishes: r.restaurantDishes?.slice(0, 10).map(rd => ({
        name: rd.dish?.name || '',
        price: rd.price,
      })).filter(d => d.name) || [],
      workingHours: r.workingHours?.map(wh => ({
        day: wh.dayOfWeek,
        open: wh.openTime,
        close: wh.closeTime,
      })) || [],
      lat: r.lat ? Number(r.lat) : null,
      lng: r.lng ? Number(r.lng) : null,
    };
  }

  /** Haversine distance in km */
  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** Sort restaurants by distance from user, add distanceKm */
  private sortByDistance(restaurants: RestaurantSummary[], userLat: number, userLng: number): RestaurantSummary[] {
    return restaurants
      .map(r => ({
        ...r,
        distanceKm: r.lat && r.lng ? Math.round(this.haversine(userLat, userLng, r.lat, r.lng) * 10) / 10 : undefined,
      }))
      .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  }

  /** Format working hours for LLM context */
  private formatHours(wh: { day: number; open: string | null; close: string | null }[]): string {
    if (!wh.length) return '';
    const DAY = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    return wh
      .sort((a, b) => a.day - b.day)
      .map(h => `${DAY[h.day] || h.day}: ${h.open}–${h.close}`)
      .join(', ');
  }

  /**
   * Pre-analyze restaurants for dish match (done in code, not by LLM)
   */
  private analyzeDishMatch(restaurants: RestaurantSummary[], dish: string, relatedDishes?: string[]): { restaurant: RestaurantSummary; matchType: 'exact' | 'similar' | 'none'; matchedDish?: string }[] {
    const dishLower = dish.toLowerCase();
    const related = (relatedDishes || []).map(d => d.toLowerCase());

    return restaurants.map(r => {
      // Check exact match in menu
      const exactMatch = r.dishes.find(d => d.name.toLowerCase().includes(dishLower));
      if (exactMatch) {
        return { restaurant: r, matchType: 'exact' as const, matchedDish: exactMatch.name };
      }

      // Check related dish match in menu
      for (const rel of related) {
        const similarMatch = r.dishes.find(d => d.name.toLowerCase().includes(rel));
        if (similarMatch) {
          return { restaurant: r, matchType: 'similar' as const, matchedDish: similarMatch.name };
        }
      }

      // Check description for dish mention
      if (r.description) {
        const descLower = r.description.toLowerCase();
        if (descLower.includes(dishLower)) {
          return { restaurant: r, matchType: 'exact' as const, matchedDish: dish };
        }
        for (const rel of related) {
          if (descLower.includes(rel)) {
            return { restaurant: r, matchType: 'similar' as const, matchedDish: rel };
          }
        }
      }

      return { restaurant: r, matchType: 'none' as const };
    });
  }

  /**
   * Build system + user messages for LLM prompt (single source of truth)
   */
  private buildPromptMessages(query: string, restaurants: RestaurantSummary[], params?: ExtractedParams): { role: string; content: string }[] {
    const wantsTop = /лучш|топ|top|рейтинг|популярн/i.test(query);
    const searchingDish = params?.dish;

    // When searching for a dish, pre-analyze matches in code
    if (searchingDish) {
      const analyzed = this.analyzeDishMatch(restaurants, searchingDish, params?.relatedDishes);
      // Sort: exact first, then similar, skip none
      analyzed.sort((a, b) => {
        const order = { exact: 0, similar: 1, none: 2 };
        return order[a.matchType] - order[b.matchType];
      });
      const relevant = analyzed.filter(a => a.matchType !== 'none').slice(0, 6);

      const restaurantLines = relevant.map((a, i) => {
        const r = a.restaurant;
        const parts: string[] = [];
        if (a.matchType === 'exact') {
          parts.push(`НАЙДЕНО В МЕНЮ: ${a.matchedDish}`);
        } else {
          parts.push(`ПОХОЖЕЕ БЛЮДО В МЕНЮ: ${a.matchedDish}`);
        }
        if (r.address) parts.push(`Адрес: ${r.address}`);
        if (r.metroStation) parts.push(`Метро: ${r.metroStation}`);
        if (r.averageBill) parts.push(`Средний чек: ${r.averageBill} ₽`);
        if (r.distanceKm !== undefined) parts.push(`Расстояние: ${r.distanceKm} км`);
        if (r.cuisines.length) parts.push(`Кухня: ${r.cuisines.join(', ')}`);
        return `${i + 1}. ${r.name} | ${parts.join(' | ')}`;
      }).join('\n');

      const systemMessage = `Ты — MenuRest AI. Пиши на русском, живым языком, как друг.

Пользователь ищет: "${searchingDish}".
Мы уже проанализировали меню ресторанов. Для каждого указано, что именно найдено.

ПРАВИЛА:
1. Если написано "НАЙДЕНО В МЕНЮ" — значит блюдо есть, рекомендуй его.
2. Если написано "ПОХОЖЕЕ БЛЮДО В МЕНЮ" — честно скажи что именно "${searchingDish}" нет, но есть [название]. Коротко объясни почему это может подойти.
3. Используй ТОЛЬКО факты из данных. НЕ выдумывай блюда и НЕ предполагай что "наверняка есть".
4. Тип кухни НЕ является доказательством наличия блюда. Не пиши "итальянская кухня, значит есть десерты".
5. Без эмодзи. Без списков. Названия ресторанов без кавычек. Между ресторанами — пустая строка.
6. Упомяни расстояние, адрес/метро, средний чек если есть.`;

      const userMessage = `Запрос: "${query}"

Результаты анализа меню:
${restaurantLines || 'Ничего подходящего не найдено.'}

${relevant.length === 0 ? 'Честно скажи что по запросу ничего не нашлось.' : 'Напиши рекомендацию на основе найденного.'}`;

      return [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ];
    }

    // Non-dish search: general recommendation
    const restaurantContext = restaurants.slice(0, 10).map((r, i) => {
      const parts = [`${i + 1}. ${r.name}`];
      if (r.city) parts.push(`Город: ${r.city}`);
      if (r.address) parts.push(`Адрес: ${r.address}`);
      if (r.metroStation) parts.push(`Метро: ${r.metroStation}`);
      if (r.cuisines.length) parts.push(`Кухня: ${r.cuisines.join(', ')}`);
      if (r.features.length) parts.push(`Особенности: ${r.features.join(', ')}`);
      if (wantsTop && r.rating > 0) parts.push(`Рейтинг: ${r.rating.toFixed(1)}/5`);
      if (r.averageBill) parts.push(`Средний чек: ${r.averageBill} ₽`);
      if (r.venueType) parts.push(`Тип: ${r.venueType}`);
      if (r.phone) parts.push(`Тел: ${r.phone}`);
      if (r.dishes.length) parts.push(`Меню: ${r.dishes.map(d => d.price ? `${d.name} (${d.price}₽)` : d.name).join(', ')}`);
      if (r.workingHours.length) parts.push(`Часы работы: ${this.formatHours(r.workingHours)}`);
      if (r.distanceKm !== undefined) parts.push(`Расстояние: ${r.distanceKm} км`);
      if (r.description) parts.push(`Описание: ${r.description.slice(0, 150)}`);
      return parts.join(' | ');
    }).join('\n');

    const systemMessage = `Ты — MenuRest AI, персональный помощник в выборе ресторана. Отвечай как опытный друг-гурман: тепло, конкретно, по делу. Пиши на русском.

ПРАВИЛА:
1. Рекомендуй СТРОГО по запросу. НЕ приписывай намерения, которых пользователь не высказывал.
2. Выбери 2-4 лучших варианта из списка.
3. Для каждого — 2-3 предложения: почему подходит + факты (средний чек, адрес/метро, расстояние). Рейтинг упоминай ТОЛЬКО если просят лучшие/топ.
4. Пиши живым языком, как друг. Без списков и буллетов. Названия без кавычек.
5. Не используй эмодзи. Между ресторанами — пустая строка.
6. НЕ выдумывай информацию. Используй ТОЛЬКО данные из списка.
7. Если ничего не подходит — честно скажи.
8. Если указано расстояние — упомяни (например, "всего в 1.2 км от вас").`;

    const userMessage = `Запрос: "${query}"

Рестораны:
${restaurantContext}

Напиши рекомендацию.`;

    return [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ];
  }

  /**
   * LLM generates personalized recommendation based on real restaurant data
   */
  private async generateRecommendation(query: string, restaurants: RestaurantSummary[], params?: ExtractedParams): Promise<string> {
    const messages = this.buildPromptMessages(query, restaurants, params);

    try {
      const timeoutMs = this.config.get<number>('LLM_TIMEOUT_MS', 30000);

      const fetchLLM = async (): Promise<string> => {
        const response = await fetch(`${this.ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.ollamaModel,
            messages,
            stream: false,
            options: { temperature: 0.2, num_predict: 600 },
          }),
        });
        if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
        const data = await response.json();
        return (data.message?.content ?? '').trim();
      };

      const text = await Promise.race([
        fetchLLM(),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('LLM timeout')), timeoutMs),
        ),
      ]);

      if (text.length > 20) {
        this.logger.debug(`AI recommendation generated (${text.length} chars)`);
        return text;
      }

      throw new Error('LLM response too short');
    } catch (err) {
      this.logger.warn(`LLM recommendation failed: ${(err as Error).message}`);
      return this.buildFallbackRecommendation(query, restaurants);
    }
  }

  /**
   * Fallback: generate a simple recommendation without LLM
   */
  private buildFallbackRecommendation(query: string, restaurants: RestaurantSummary[]): string {
    const top = restaurants.slice(0, 5);
    const wantsTop = /лучш|топ|top|рейтинг|популярн/i.test(query);
    const lines = [`По запросу "${query}" нашлось ${restaurants.length} вариантов:\n`];

    top.forEach((r) => {
      const facts: string[] = [];
      if (r.cuisines.length) facts.push(r.cuisines.join(', '));
      if (wantsTop && r.rating > 0) facts.push(`⭐ ${r.rating.toFixed(1)}`);
      if (r.averageBill) facts.push(`~${r.averageBill} ₽`);
      if (r.distanceKm !== undefined) facts.push(`${r.distanceKm} км`);
      if (r.metroStation) facts.push(`м. ${r.metroStation}`);
      else if (r.city) facts.push(r.city);

      lines.push(`${r.name} — ${facts.join(' · ')}`);
      if (r.dishes.length) {
        lines.push(`Из меню: ${r.dishes.slice(0, 3).map(d => d.name).join(', ')}`);
      }
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Streaming version: yields restaurant data first, then LLM tokens one by one
   */
  async *recommendStream(query: string, userLat?: number, userLng?: number): AsyncGenerator<string> {
    // Step 1: Extract keywords
    this.logger.log(`[AI-Stream] raw query type=${typeof query}, length=${query?.length}, hex=${Buffer.from(query || '').toString('hex').slice(0, 60)}`);
    const params = extractKeywords(query);
    this.logger.log(`[AI-Stream] params=${JSON.stringify(params)}`);

    // Step 2: Find restaurants
    let restaurants = await this.findRelevantRestaurants(query, params, false, userLat, userLng);
    this.logger.log(`[AI-Stream] strict search: ${restaurants.length} results`);

    // If dish search found few results, also search for related dishes
    if (params.dish && restaurants.length < 10 && params.relatedDishes?.length) {
      for (const related of params.relatedDishes.slice(0, 4)) {
        const relatedParams = { ...params, dish: related, relatedDishes: undefined };
        const more = await this.findRelevantRestaurants(query, relatedParams, false, userLat, userLng);
        const existingIds = new Set(restaurants.map(r => r.id));
        for (const r of more) {
          if (!existingIds.has(r.id)) { restaurants.push(r); existingIds.add(r.id); }
        }
        if (restaurants.length >= 15) break;
      }
      this.logger.log(`[AI-Stream] after related search: ${restaurants.length} results`);
    }

    if (restaurants.length === 0) {
      restaurants = await this.findRelevantRestaurants(query, params, true, userLat, userLng);
    }
    if (restaurants.length === 0) {
      restaurants = await this.broadTextSearch(query);
    }

    // If user has geo, sort by distance and add distance info
    if (userLat && userLng && restaurants.length > 0) {
      restaurants = this.sortByDistance(restaurants, userLat, userLng);
    }

    // Send restaurants + params as first SSE event
    yield JSON.stringify({
      type: 'restaurants',
      restaurants,
      params,
      source: this.ollamaUrl ? 'ai' : 'fallback',
    });

    // Step 3: Stream LLM recommendation
    if (this.ollamaUrl && restaurants.length > 0) {
      yield* this.streamRecommendation(query, restaurants, params);
    } else if (restaurants.length > 0) {
      // Fallback: send entire text as one token event
      const text = this.buildFallbackRecommendation(query, restaurants);
      yield JSON.stringify({ type: 'token', text });
    } else {
      yield JSON.stringify({
        type: 'token',
        text: 'К сожалению, по вашему запросу ничего не найдено. Попробуйте изменить запрос или указать другие критерии.',
      });
    }

    yield JSON.stringify({ type: 'done' });
  }

  /**
   * Stream LLM tokens from Ollama
   */
  private async *streamRecommendation(
    query: string,
    restaurants: RestaurantSummary[],
    params?: ExtractedParams,
  ): AsyncGenerator<string> {
    const messages = this.buildPromptMessages(query, restaurants, params);

    try {
      const response = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          messages,
          stream: true,
          options: { temperature: 0.2, num_predict: 600 },
        }),
      });

      if (!response.ok || !response.body) {
        const fallback = this.buildFallbackRecommendation(query, restaurants);
        yield JSON.stringify({ type: 'token', text: fallback });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.message?.content) {
              yield JSON.stringify({ type: 'token', text: chunk.message.content });
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const chunk = JSON.parse(buffer);
          if (chunk.message?.content) {
            yield JSON.stringify({ type: 'token', text: chunk.message.content });
          }
        } catch {
          // skip
        }
      }
    } catch (err) {
      this.logger.warn(`LLM stream failed: ${(err as Error).message}`);
      const fallback = this.buildFallbackRecommendation(query, restaurants);
      yield JSON.stringify({ type: 'token', text: fallback });
    }
  }

  /** Old parse method — kept for backward compatibility if needed */
  async parse(query: string): Promise<ExtractedParams & { source: string }> {
    const extracted = extractKeywords(query);
    return { ...extracted, source: 'keywords' };
  }
}
