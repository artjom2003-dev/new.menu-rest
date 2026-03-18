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
      recommendation = await this.generateRecommendation(query, restaurants);
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
  private async findRelevantRestaurants(query: string, params: ExtractedParams, relaxed = false): Promise<RestaurantSummary[]> {
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
      qb.andWhere(
        `(r.name ILIKE :dish OR r.description ILIKE :dish OR EXISTS (
          SELECT 1 FROM restaurant_dishes rd JOIN dishes d ON d.id = rd.dish_id
          WHERE rd.restaurant_id = r.id AND d.name ILIKE :dish
        ))`,
        { dish: `%${params.dish}%` },
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

    // When dish is set and cuisine was skipped as hard filter, boost matching cuisine to top
    if (params.dish && params.cuisine) {
      qb.addSelect(
        `CASE WHEN EXISTS (SELECT 1 FROM restaurant_cuisines rc JOIN cuisines c ON c.id = rc.cuisine_id WHERE rc.restaurant_id = r.id AND c.slug = :boostCuisine) THEN 0 ELSE 1 END`,
        'cuisine_boost',
      );
      qb.setParameter('boostCuisine', params.cuisine);
      qb.orderBy('cuisine_boost', 'ASC');
      qb.addOrderBy('r.rating', 'DESC');
    } else {
      qb.orderBy('r.rating', 'DESC');
    }
    qb.addOrderBy('r.reviewCount', 'DESC')
      .take(15);

    const items = await qb.getMany();

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
   * Build system + user messages for LLM prompt (single source of truth)
   */
  private buildPromptMessages(query: string, restaurants: RestaurantSummary[]): { role: string; content: string }[] {
    const restaurantContext = restaurants.slice(0, 10).map((r, i) => {
      const parts = [`${i + 1}. ${r.name}`];
      if (r.city) parts.push(`Город: ${r.city}`);
      if (r.address) parts.push(`Адрес: ${r.address}`);
      if (r.metroStation) parts.push(`Метро: ${r.metroStation}`);
      if (r.cuisines.length) parts.push(`Кухня: ${r.cuisines.join(', ')}`);
      if (r.features.length) parts.push(`Особенности: ${r.features.join(', ')}`);
      if (r.rating > 0) parts.push(`Рейтинг: ${r.rating.toFixed(1)}/5`);
      if (r.averageBill) parts.push(`Средний чек: ${r.averageBill} ₽`);
      if (r.venueType) parts.push(`Тип: ${r.venueType}`);
      if (r.phone) parts.push(`Тел: ${r.phone}`);
      if (r.dishes.length) parts.push(`Блюда: ${r.dishes.map(d => d.price ? `${d.name} (${d.price}₽)` : d.name).join(', ')}`);
      if (r.workingHours.length) parts.push(`Часы работы: ${this.formatHours(r.workingHours)}`);
      if (r.distanceKm !== undefined) parts.push(`Расстояние: ${r.distanceKm} км`);
      if (r.description) parts.push(`Описание: ${r.description.slice(0, 150)}`);
      return parts.join(' | ');
    }).join('\n');

    const systemMessage = `Ты — MenuRest AI, персональный помощник в выборе ресторана. Отвечай как опытный друг-гурман: тепло, конкретно, по делу. Пиши на русском языке.

ПРАВИЛА:
1. Рекомендуй СТРОГО по запросу пользователя. Если просят итальянскую кухню — рекомендуй только итальянскую. Никогда не подставляй другую кухню вместо запрошенной.
2. Выбери 2-4 лучших варианта из предоставленного списка ресторанов.
3. Для каждого ресторана напиши 2-3 предложения: почему он подходит под запрос + ключевые факты (средний чек, метро или адрес, рейтинг).
4. Пиши живым разговорным языком — как будто советуешь другу. Без нумерованных списков, без буллетов.
5. Пиши названия ресторанов как есть, без форматирования и без кавычек.
6. Не используй эмодзи, кроме одной звёздочки ⭐ рядом с рейтингом.
7. НЕ выдумывай информацию, которой нет в данных о ресторанах.
8. Если ни один ресторан из списка не подходит идеально — честно скажи об этом и предложи ближайшие варианты.
9. Между описаниями ресторанов оставляй пустую строку для читаемости.
10. Если указано расстояние до ресторана — упомяни его (например, "всего в 1.2 км от вас").`;

    const userMessage = `Запрос: "${query}"

Рестораны из нашей базы:
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
  private async generateRecommendation(query: string, restaurants: RestaurantSummary[]): Promise<string> {
    const messages = this.buildPromptMessages(query, restaurants);

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
            options: { temperature: 0.4, num_predict: 600 },
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
    const lines = [`По запросу "${query}" нашлось ${restaurants.length} вариантов. Вот лучшие:\n`];

    top.forEach((r) => {
      const facts: string[] = [];
      if (r.cuisines.length) facts.push(r.cuisines.join(', '));
      if (r.rating > 0) facts.push(`⭐ ${r.rating.toFixed(1)}`);
      if (r.averageBill) facts.push(`~${r.averageBill} ₽`);
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
    const params = extractKeywords(query);

    // Step 2: Find restaurants (same logic as recommend())
    let restaurants = await this.findRelevantRestaurants(query, params);
    if (restaurants.length === 0) {
      restaurants = await this.findRelevantRestaurants(query, params, true);
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
      yield* this.streamRecommendation(query, restaurants);
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
  ): AsyncGenerator<string> {
    const messages = this.buildPromptMessages(query, restaurants);

    try {
      const response = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          messages,
          stream: true,
          options: { temperature: 0.4, num_predict: 600 },
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
