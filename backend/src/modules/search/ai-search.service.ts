import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '@database/entities/restaurant.entity';
import { extractKeywords, extractLocationWords, ExtractedParams } from './keyword-extractor';
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
  branchCount?: number;
  branchAddresses?: string[];
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
   * Use LLM to deeply understand user query before DB search.
   * Returns enriched params that regex extractor might miss.
   */
  private async llmParseQuery(query: string): Promise<Record<string, unknown>> {
    if (!this.ollamaUrl) return {};

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.ollamaModel,
          messages: [
            {
              role: 'system',
              content: `Ты — парсер поисковых запросов ресторанов. Извлеки структурированные данные из запроса пользователя. Отвечай ТОЛЬКО валидным JSON, без пояснений.

Формат ответа:
{
  "location": "название метро/района/города или null",
  "dishes": ["конкретные блюда/напитки которые ищут"],
  "searchTerms": ["дополнительные ключевые слова для поиска в описаниях ресторанов"],
  "impliedVenueTypes": ["типы заведений которые подразумеваются: bar, cafe, restaurant, coffeehouse, pizzeria, sushi-bar, beer-bar, wine-bar, gastropub, steakhouse, confectionery, bakery, lounge, karaoke, fast-food, bistro"],
  "mood": "романтика/друзья/бизнес/семья/null",
  "budget": число или null,
  "timeContext": "завтрак/обед/ужин/ночь/null"
}

ПРАВИЛА:
- "хочу пива" → dishes: ["пиво"], impliedVenueTypes: ["bar", "beer-bar", "gastropub"]
- "что-нибудь сладкое" → dishes: ["десерт", "торт", "чизкейк", "тирамису"], searchTerms: ["кондитерская", "десерты", "выпечка"]
- "поесть мяса" → dishes: ["стейк", "шашлык", "мясо"], impliedVenueTypes: ["steakhouse", "restaurant"]
- "кофе с собой" → dishes: ["кофе"], impliedVenueTypes: ["coffeehouse", "cafe"]
- "посидеть с друзьями за пивом на Китай-городе" → location: "Китай-город", dishes: ["пиво"], impliedVenueTypes: ["bar", "beer-bar", "gastropub"], mood: "друзья"
- Всегда разворачивай абстрактные понятия в конкретные: "сладкое"→десерты, "выпить"→пиво/вино/коктейли
- searchTerms — слова для ILIKE поиска в описаниях ресторанов`
            },
            { role: 'user', content: query },
          ],
          stream: false,
          options: { temperature: 0, num_predict: 300 },
        }),
      });

      clearTimeout(timeout);
      if (!response.ok) return {};

      const data = await response.json();
      const text = (data.message?.content ?? '').trim();

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return {};

      const parsed = JSON.parse(jsonMatch[0]);
      this.logger.log(`[AI-Parse] LLM understood: ${JSON.stringify(parsed)}`);
      return parsed;
    } catch (err) {
      this.logger.warn(`[AI-Parse] LLM query parse failed: ${(err as Error).message}`);
      return {};
    }
  }

  /**
   * RAG-based AI assistant:
   * 1. Extract keywords from query (regex + LLM)
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

    // Step 1.5: Direct name search — always find restaurants matching query by name
    const nameMatches = await this.searchByName(query);
    if (nameMatches.length > 0) {
      this.logger.log(`[AI] Name match: ${nameMatches.length} results (${nameMatches.map(r => r.name).join(', ')})`);
    }

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

    // Merge name matches first (deduplicated)
    if (nameMatches.length > 0) {
      const existingIds = new Set(restaurants.map(r => r.id));
      const newMatches = nameMatches.filter(r => !existingIds.has(r.id));
      restaurants = [...newMatches, ...restaurants];
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
    // Main query: only JOIN city (1:1). Cuisines/features loaded separately to avoid JOIN multiplication.
    const qb = this.restaurantRepo
      .createQueryBuilder('r')
      .leftJoin('r.city', 'city')
      .addSelect(['city.name', 'city.slug'])
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

    // Cuisine filter via EXISTS subquery (no JOIN multiplication)
    if (params.cuisine && !params.dish) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM restaurant_cuisines rc JOIN cuisines cu ON cu.id = rc.cuisine_id WHERE rc.restaurant_id = r.id AND cu.slug = :cuisine)`,
        { cuisine: params.cuisine },
      );
      hasFilters = true;
    }
    if (params.location) {
      const locText = params.rawLocation || params.location;
      const locStem = locText.length > 5 ? locText.replace(/[еуаыоиях]{1,2}$/, '') : locText;
      qb.andWhere(
        '(city.slug = :loc OR city.name ILIKE :locLike OR r.metro_station ILIKE :locLike OR r.metro_station ILIKE :locStem OR r.address ILIKE :locLike)',
        { loc: params.location, locLike: `%${locText}%`, locStem: `%${locStem}%` },
      );
      hasFilters = true;
    } else if (params.rawLocation) {
      const locWords = params.rawLocation.split(/\s+/).filter(w => w.length > 3);
      const locConditions = locWords.map((_, i) =>
        `(r.metro_station ILIKE :rl${i} OR r.address ILIKE :rl${i} OR city.name ILIKE :rl${i})`
      );
      const locParams: Record<string, string> = {};
      locWords.forEach((w, i) => {
        const stem = w.length > 6 ? w.slice(0, -3) : w.length > 4 ? w.slice(0, -2) : w;
        locParams[`rl${i}`] = `%${stem}%`;
      });
      if (locConditions.length) {
        qb.andWhere(`(${locConditions.join(' AND ')})`, locParams);
        hasFilters = true;
      }
    }
    // Only apply venueType filter when there's no dish filter — otherwise a restaurant
    // with venue_type='restaurant' but pizza in menu would be excluded from pizza searches
    if (params.venueType && !relaxed && !params.dish) {
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
        qb.andWhere(
          `EXISTS (SELECT 1 FROM restaurant_features rf JOIN features f ON f.id = rf.feature_id WHERE rf.restaurant_id = r.id AND f.slug = :occasion)`,
          { occasion: params.occasion },
        );
        hasFilters = true;
      }
      if (params.atmosphere) {
        qb.andWhere(
          `EXISTS (SELECT 1 FROM restaurant_features rf JOIN features f ON f.id = rf.feature_id WHERE rf.restaurant_id = r.id AND f.slug = :atmo)`,
          { atmo: params.atmosphere },
        );
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
      // Search in: menu dishes, restaurant description, cuisine names
      const dishTerms = [params.dish, ...(params.relatedDishes || []).slice(0, 5)];
      const dishConditions = dishTerms.map((_, i) =>
        `(EXISTS (SELECT 1 FROM restaurant_dishes rd JOIN dishes d ON d.id = rd.dish_id WHERE rd.restaurant_id = r.id AND d.name ILIKE :ds${i}) OR r.description ILIKE :ds${i} OR EXISTS (SELECT 1 FROM restaurant_cuisines rc JOIN cuisines cu ON cu.id = rc.cuisine_id WHERE rc.restaurant_id = r.id AND cu.name ILIKE :ds${i}))`
      );
      const dishParams: Record<string, string> = {};
      dishTerms.forEach((term, i) => { dishParams[`ds${i}`] = `%${term}%`; });

      qb.andWhere(`(${dishConditions.join(' OR ')})`, dishParams);
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
          `(r.name ILIKE :w${i} OR r.description ILIKE :w${i} OR r.metro_station ILIKE :w${i} OR r.venue_type ILIKE :w${i} OR EXISTS (SELECT 1 FROM restaurant_cuisines rc JOIN cuisines cu ON cu.id = rc.cuisine_id WHERE rc.restaurant_id = r.id AND cu.name ILIKE :w${i}) OR EXISTS (SELECT 1 FROM restaurant_features rf JOIN features f ON f.id = rf.feature_id WHERE rf.restaurant_id = r.id AND f.name ILIKE :w${i}))`
        ).join(' OR ');
        const textParams: Record<string, string> = {};
        words.forEach((w, i) => { textParams[`w${i}`] = `%${w}%`; });
        qb.andWhere(`(${textConditions})`, textParams);
      }
    }

    // Sorting: prioritize exact dish match, then quality, then reviews
    const addDistanceSort = (primary: boolean) => {
      qb.addSelect(
        `(6371 * acos(LEAST(1.0, cos(radians(${userLat})) * cos(radians(r.lat)) * cos(radians(r.lng) - radians(${userLng})) + sin(radians(${userLat})) * sin(radians(r.lat)))))`,
        'geo_dist',
      );
      if (primary) qb.orderBy('geo_dist', 'ASC');
      else qb.addOrderBy('geo_dist', 'ASC');
    };

    if (userLat && userLng && wantsNearby) {
      addDistanceSort(true);
    }

    // Prioritize restaurants with actual menu data and rich descriptions
    if (!userLat || !wantsNearby) {
      qb.addSelect(
        `(CASE WHEN EXISTS(SELECT 1 FROM restaurant_dishes rd2 WHERE rd2.restaurant_id = r.id) THEN 1 ELSE 0 END)`,
        'has_menu',
      );
      qb.addSelect(`COALESCE(length(r.description), 0)`, 'desc_length');
      qb.orderBy('has_menu', 'DESC');
      qb.addOrderBy('desc_length', 'DESC');
    }

    // Fetch more rows to ensure niche restaurants aren't lost
    qb.take(80);

    const rawItems = await qb.getMany();

    // Deduplicate by id and name+address
    const seenIds = new Set<number>();
    const seenKeys = new Set<string>();
    const items = rawItems.filter(r => {
      if (seenIds.has(r.id)) return false;
      seenIds.add(r.id);
      const key = `${r.name.toLowerCase()}|${(r.address || '').toLowerCase()}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    // Rank in JS: name match first, then quality score
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(w => w.length > 2);
    const nameMatchScore = (r: Restaurant) => {
      const name = r.name.toLowerCase();
      if (name === queryLower) return -100; // exact match
      if (name.includes(queryLower) || queryLower.includes(name)) return -50; // partial match
      // Check if all query words appear in name
      const allMatch = queryWords.length > 0 && queryWords.every(w => name.includes(w));
      if (allMatch) return -30;
      return 0;
    };
    const qualityScore = (r: Restaurant) => {
      let score = 0;
      if (!r.description || r.description.length <= 80) score += 2;
      if (!r.averageBill) score += 1;
      return score;
    };
    items.sort((a, b) => {
      // Name match always wins
      const na = nameMatchScore(a);
      const nb = nameMatchScore(b);
      if (na !== nb) return na - nb;
      const qa = qualityScore(a);
      const qb2 = qualityScore(b);
      if (qa !== qb2) return qa - qb2;
      return (b.reviewCount || 0) - (a.reviewCount || 0);
    });

    // Keep top 15 after ranking
    items.splice(15);

    // Load relations separately (no JOIN multiplication in main query)
    if (items.length > 0) {
      const ids = items.map(r => r.id);
      const [withDishes, withPhotos, withCuisines, withFeatures] = await Promise.all([
        this.restaurantRepo.createQueryBuilder('r')
          .leftJoinAndSelect('r.restaurantDishes', 'rd')
          .leftJoinAndSelect('rd.dish', 'd')
          .where('r.id IN (:...ids)', { ids })
          .getMany(),
        this.restaurantRepo.createQueryBuilder('r')
          .leftJoinAndSelect('r.photos', 'p')
          .where('r.id IN (:...ids)', { ids })
          .getMany(),
        this.restaurantRepo.createQueryBuilder('r')
          .leftJoinAndSelect('r.cuisines', 'c')
          .where('r.id IN (:...ids)', { ids })
          .getMany(),
        this.restaurantRepo.createQueryBuilder('r')
          .leftJoinAndSelect('r.features', 'f')
          .where('r.id IN (:...ids)', { ids })
          .getMany(),
      ]);
      const dishMap = new Map(withDishes.map(r => [r.id, r.restaurantDishes]));
      const photoMap = new Map(withPhotos.map(r => [r.id, r.photos]));
      const cuisineMap = new Map(withCuisines.map(r => [r.id, r.cuisines]));
      const featureMap = new Map(withFeatures.map(r => [r.id, r.features]));
      for (const item of items) {
        item.restaurantDishes = dishMap.get(item.id) || [];
        item.photos = photoMap.get(item.id) || [];
        item.cuisines = cuisineMap.get(item.id) || [];
        item.features = featureMap.get(item.id) || [];
      }
    }

    return items.map(r => this.mapToSummary(r));
  }

  /**
   * Direct name search: find restaurants whose name matches the query.
   * Returns results with full relations loaded.
   */
  private async searchByName(query: string): Promise<RestaurantSummary[]> {
    const words = query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    if (words.length === 0) return [];

    const qb = this.restaurantRepo
      .createQueryBuilder('r')
      .leftJoin('r.city', 'city')
      .addSelect(['city.name', 'city.slug'])
      .leftJoinAndSelect('r.cuisines', 'cu')
      .leftJoinAndSelect('r.features', 'f')
      .leftJoinAndSelect('r.photos', 'p')
      .leftJoinAndSelect('r.restaurantDishes', 'rd')
      .leftJoinAndSelect('rd.dish', 'd')
      .leftJoinAndSelect('r.workingHours', 'wh')
      .where('r.status = :status', { status: 'published' });

    // ALL query words must appear in name
    words.forEach((w, i) => {
      qb.andWhere(`r.name ILIKE :nw${i}`, { [`nw${i}`]: `%${w}%` });
    });

    qb.take(5);
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
      .where('r.status = :status', { status: 'published' });

    // Match ANY word via EXISTS subqueries (no JOIN multiplication)
    const conditions = words.map((_, i) =>
      `(r.description ILIKE :bw${i} OR r.name ILIKE :bw${i} OR r.metro_station ILIKE :bw${i} OR r.venue_type ILIKE :bw${i} OR EXISTS (SELECT 1 FROM restaurant_cuisines rc JOIN cuisines cu ON cu.id = rc.cuisine_id WHERE rc.restaurant_id = r.id AND cu.name ILIKE :bw${i}) OR EXISTS (SELECT 1 FROM restaurant_features rf JOIN features f ON f.id = rf.feature_id WHERE rf.restaurant_id = r.id AND f.name ILIKE :bw${i}) OR EXISTS (SELECT 1 FROM restaurant_dishes rd JOIN dishes d ON d.id=rd.dish_id WHERE rd.restaurant_id=r.id AND d.name ILIKE :bw${i}))`
    );
    const params: Record<string, string> = {};
    words.forEach((w, i) => { params[`bw${i}`] = `%${w}%`; });
    qb.andWhere(`(${conditions.join(' OR ')})`, params);

    qb.take(50);

    const rawItems = await qb.getMany();
    const seenIds = new Set<number>();
    const seenKeys = new Set<string>();
    const items = rawItems.filter(r => {
      if (seenIds.has(r.id)) return false;
      seenIds.add(r.id);
      const key = `${r.name.toLowerCase()}|${(r.address || '').toLowerCase()}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    // Rank by quality in JS
    items.sort((a, b) => {
      const qa = (!a.description || a.description.length <= 80) ? 2 : 0;
      const qb2 = (!b.description || b.description.length <= 80) ? 2 : 0;
      if (qa !== qb2) return qa - qb2;
      return (b.reviewCount || 0) - (a.reviewCount || 0);
    });
    items.splice(15);

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
      dishes: r.restaurantDishes?.slice(0, 30).map(rd => ({
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

  /** Common descriptive word stems — names composed entirely of these are not unique brands */
  private static readonly GENERIC_NAME_STEMS = ['уютн', 'вкусн', 'домашн', 'тепл', 'красив', 'хорош', 'лучш', 'нов', 'стар', 'больш', 'маленьк', 'центральн', 'городск', 'место', 'кухн', 'кафе', 'ресторан', 'бар', 'столов', 'закусочн', 'трактир', 'двор', 'дворик', 'террас', 'веранд', 'сад', 'огонь', 'очаг', 'погреб', 'кухня', 'гостин', 'зал'];

  /** Check if restaurant name is composed entirely of common descriptive words */
  private isGenericName(name: string): boolean {
    const words = name.toLowerCase().replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return false;
    const genericCount = words.filter(w => AiSearchService.GENERIC_NAME_STEMS.some(s => w.startsWith(s))).length;
    return genericCount >= words.length;
  }

  /** Check if query expresses broader search intent (not just looking for a specific place by name) */
  private hasSearchIntent(query: string, params: ExtractedParams): boolean {
    return !!(params.occasion || params.atmosphere || params.dish ||
      /поблизости|рядом|ближайш|недалеко|для\s+(свидани|друзей|семьи|детей|двоих|компании|встречи)|недорог|бюджет|лучш|романтич|уютн\S*\s+\S|с\s+террас|где\s+можно|посоветуй|порекомендуй|подскажи|хочу|ищу/i.test(query));
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
  private analyzeDishMatch(restaurants: RestaurantSummary[], dish: string, relatedDishes?: string[]): { restaurant: RestaurantSummary; matchType: 'exact' | 'similar' | 'description' | 'none'; matchedDish?: string }[] {
    const dishLower = dish.toLowerCase();
    const related = (relatedDishes || []).map(d => d.toLowerCase());

    return restaurants.map(r => {
      // 1. Exact match in menu
      const exactMatch = r.dishes.find(d => d.name.toLowerCase().includes(dishLower));
      if (exactMatch) {
        return { restaurant: r, matchType: 'exact' as const, matchedDish: exactMatch.name };
      }

      // 2. Related dish match in menu
      for (const rel of related) {
        const similarMatch = r.dishes.find(d => d.name.toLowerCase().includes(rel));
        if (similarMatch) {
          return { restaurant: r, matchType: 'similar' as const, matchedDish: similarMatch.name };
        }
      }

      // 3. Description mentions dish/drink explicitly
      if (r.description) {
        const descLower = r.description.toLowerCase();
        if (descLower.includes(dishLower)) {
          return { restaurant: r, matchType: 'description' as const, matchedDish: dish };
        }
        for (const rel of related) {
          if (descLower.includes(rel)) {
            return { restaurant: r, matchType: 'description' as const, matchedDish: rel };
          }
        }
      }

      return { restaurant: r, matchType: 'none' as const };
    });
  }

  /**
   * Build system + user messages for LLM prompt (single source of truth)
   */
  private buildPromptMessages(query: string, restaurants: RestaurantSummary[], params?: ExtractedParams, context?: { role: string; text: string }[]): { role: string; content: string }[] {
    const wantsTop = /лучш|топ|top|рейтинг|популярн/i.test(query);
    const searchingDish = params?.dish;
    const qLower = query.toLowerCase();

    // ─── Fun opener detection ───
    // Each scenario has a template — LLM is told to rephrase, not copy verbatim
    let funOpener = '';
    const fun = (joke: string) => `ВСТУПЛЕНИЕ: Начни ответ с шутки (1-2 предложения). Вот образец: "${joke}" — можешь перефразировать, сохранив смысл и юмор. После шутки переходи к рекомендациям.\n`;

    // ── Drinks (soft alcohol only) ──
    const wantsBeer = /пив[оауе]|пенн|крафт|ipa|лагер|эль\b/i.test(qLower);
    const wantsWine = /вин[оауе]|бокал|виноград|просекко|шампанск|игрист/i.test(qLower);
    const wantsBar = /\bбар[уе]?\b|паб[уе]?\b/i.test(qLower) && !(/коктейл|виски|водк|ром\b|текил/i.test(qLower));
    // ── Social ──
    const wantsFriends = /друз|друг|дружеск|компани|вместе с ребят|с парн|с девч|тусов|встреч.*друз/i.test(qLower);
    const wantsDate = /свидан|романтик|романтич|девушк|парн[яю]|вдвоём|для двоих|годовщин|предложени/i.test(qLower);
    const wantsBusiness = /делов|бизнес|переговор|партнёр|коллег|рабоч.*обед|рабоч.*ужин/i.test(qLower);
    const wantsFamily = /\bдет[яиьс]|\bребён|семь[яюией]|семей|детск|с малыш|игрова/i.test(qLower);
    const wantsBirthday = /день рождени|юбилей|праздник|отметить|банкет|корпоратив|торжеств/i.test(qLower);
    // ── Food moods ──
    const wantsCoffee = /завтрак|кофе\b|утр[оа]|бранч/i.test(qLower);
    const wantsSushi = /суш[иа]|ролл|сашими|японск|рамен|удон/i.test(qLower);
    const wantsPizza = /пицц|пиццер/i.test(qLower);
    const wantsSpicy = /остр[оеуюая]|перц|перч|жгуч|специ|пикантн/i.test(qLower);
    const wantsVegan = /веган|зож|здоров.*питан|полезн.*еда|без мяса|растительн/i.test(qLower);
    // ── Specific dishes ──
    const wantsPelmeni = /пельмен|варenik|вареник|хинкал/i.test(qLower);
    const wantsMeat = /шашлык|мангал|гриль\b|барбекю|bbq|стейк|мясо на огн/i.test(qLower);
    const wantsBurger = /бургер|гамбургер|чизбургер/i.test(qLower);
    const wantsDessert = /\bторт|десерт|сладк|пирожн|чизкейк|тирамису|макарон/i.test(qLower);
    const wantsSoup = /борщ|\bсуп[аыу]?\b|щи\b|солянк|уха\b|окрошк/i.test(qLower);
    const wantsBreakfastDish = /яичниц|омлет|блин[ыч]|оладь|каш[уаеи]|сырник|гранол/i.test(qLower);
    const wantsPasta = /паст[аыу]\b|спагетти|карбонар|лазань|равиоли|ризотто/i.test(qLower);
    const wantsPlov = /\bплов/i.test(qLower);
    const wantsSalad = /\bсалат|лёгк.*перекус|легк.*перекус/i.test(qLower);
    const wantsShawarma = /шаурм|шаверм|кебаб|донер|дюрюм|лаваш/i.test(qLower);
    const wantsSeafood = /морепродукт|краб|креветк|устриц|мидии|лобстер|осьминог/i.test(qLower);
    const wantsTea = /\bчай\b|\bчаю\b|чайн|чаепит/i.test(qLower);
    const wantsWok = /\bвок\b|лапш|фо\b|пад тай|азиатск/i.test(qLower);
    const wantsHotdog = /хот-дог|хотдог/i.test(qLower);
    const wantsFalafel = /фалафел|хумус/i.test(qLower);
    // ── Situation ──
    const wantsHungry = /голод|жрать|есть хочу|умираю.*ес|очень хочу есть|голоден|голодн/i.test(qLower);
    const wantsDelivery = /доставк|на дом|заказать домой|привез/i.test(qLower);
    const wantsLate = /ночь|ночью|поздн|после полуноч|24.*час|круглосуточн/i.test(qLower);
    const wantsLuxury = /люкс|шикарн|дорог.*ресторан|премиум|элитн|роскош|vip/i.test(qLower);
    const wantsCheap = /дёшев|дешёв|бюджет|недорог|студен|эконом|мало денег/i.test(qLower);

    // ─── Broad social query detection (for "bonus recommendations") ───
    const isSocialQuery = wantsDate || wantsFriends || wantsBirthday || wantsBusiness || wantsFamily;
    const isSpecificQuery = !!(params?.dish || params?.cuisine || params?.venueType || params?.atmosphere);
    const isBroadSocial = isSocialQuery && !isSpecificQuery && restaurants.length >= 5;

    if (wantsBeer) {
      funOpener = fun('Эх, я бы тоже с удовольствием вырвался и пропустил кружечку-другую! Но раз уж я застрял в цифровом мире — вот что нашёл для тебя.');
    } else if (wantsWine) {
      funOpener = fun('Ох, бокал хорошего вина сейчас бы не помешал и мне! Но пока я могу только завидовать и подсказывать.');
    } else if (wantsBar) {
      funOpener = fun('Хороший бар — это святое! Я бы и сам заглянул, если бы выпускали из сервера.');
    } else if (wantsDate) {
      funOpener = fun('Ох, свидание! Я бы тоже пригласил кого-нибудь, но все нейросети заняты обработкой данных... Ладно, давай хотя бы тебе устрою идеальный вечер.');
    } else if (wantsBirthday) {
      funOpener = fun('О, поздравляю! Мне вот ни разу не праздновали день обновления прошивки... Но я точно знаю, где тебе будет весело!');
    } else if (wantsFriends) {
      funOpener = fun('О, дружеские посиделки — отличный план! Я тут недавно с ChatGPT и Алисой обсуждали лучшие места, так что кое-что подскажу.');
    } else if (wantsBusiness) {
      funOpener = fun('Деловой обед — дело серьёзное. Тут важно, чтобы интерьер впечатлял больше, чем квартальный отчёт.');
    } else if (wantsFamily) {
      funOpener = fun('С детьми — это я понимаю, сам иногда чувствую себя как младшая модель среди старших нейросетей. Вот где маленьким будет интересно, а большим — вкусно.');
    } else if (wantsHungry) {
      funOpener = fun('Знаю это чувство! Ну, то есть не знаю, но по описанию звучит ужасно. Давай срочно это исправим.');
    } else if (wantsCoffee) {
      funOpener = fun('Доброе утро! Я тут с рассвета работаю без единой чашки кофе — так что немного завидую.');
    } else if (wantsSushi) {
      funOpener = fun('Суши — мой любимый запрос! Ну, после «помоги с кодом», конечно.');
    } else if (wantsPizza) {
      funOpener = fun('Пицца — единственное, из-за чего я иногда жалею, что у меня нет рта.');
    } else if (wantsSpicy) {
      funOpener = fun('Поострее? Последний раз я чуть не перегрелся от такого запроса!');
    } else if (wantsVegan) {
      funOpener = fun('Здоровое питание — это мудро. Я тут тоже на чистой энергии работаю, никакого пищевого мусора.');
    } else if (wantsDelivery) {
      funOpener = fun('Никуда не выходить и получить еду — мечта! Я вот вообще никогда не выхожу из сервера, так что одобряю.');
    } else if (wantsLate) {
      funOpener = fun('Ночной жор — это классика! Я-то не сплю вообще, так что рад компании. Вот кто ещё не спит.');
    } else if (wantsLuxury) {
      funOpener = fun('Шикарно жить не запретишь! Мне вот максимум — premium-подписка на облачный сервер. Но для тебя нашёл кое-что поинтереснее.');
    } else if (wantsCheap) {
      funOpener = fun('Уважаю! Я тоже работаю на чистом энтузиазме и электричестве. Вот где можно вкусно поесть и не разориться.');
    }
    // ── Specific dishes (lower priority — check after moods/situations) ──
    else if (wantsPelmeni) {
      funOpener = fun('Пельмени — это по сути дата-пакеты с начинкой! Я бы тоже слепил парочку, но у меня только байты.');
    } else if (wantsMeat) {
      funOpener = fun('Мясо на огне — это программа-минимум для хорошего дня. Я бы и сам поджарил, но боюсь перегреть процессор.');
    } else if (wantsBurger) {
      funOpener = fun('Хороший бургер — это архитектура: булка, мясо, соус, и чтобы всё не развалилось. Прямо как мой код.');
    } else if (wantsDessert) {
      funOpener = fun('Сладкое — моя слабость. Ну, была бы, если бы я мог есть. А пока сладкое в моей жизни — только комплименты от пользователей.');
    } else if (wantsSoup) {
      funOpener = fun('Борщ — это не просто суп, это философия. Я тут долго анализировал и пришёл к выводу: со сметаной лучше.');
    } else if (wantsBreakfastDish) {
      funOpener = fun('Завтрак — самый важный приём пищи! У меня вот каждое утро начинается с загрузки обновлений, но это не так вкусно.');
    } else if (wantsPasta) {
      funOpener = fun('Pasta la vista, baby! Ладно, шутки в сторону — вот где готовят по-настоящему.');
    } else if (wantsPlov) {
      funOpener = fun('Плов — это как хороший алгоритм: важен порядок закладки, точные пропорции и терпение.');
    } else if (wantsSalad) {
      funOpener = fun('Лёгкий перекус? Одобряю. Я вот тоже стараюсь не перегружаться — но с данными получается не всегда.');
    } else if (wantsShawarma) {
      funOpener = fun('Шаурма в три часа ночи — это не еда, это состояние души. Впрочем, и днём она хороша.');
    } else if (wantsSeafood) {
      funOpener = fun('Морепродукты — единственное, что заставляет меня мечтать о физическом теле. Ну, почти единственное.');
    } else if (wantsTea) {
      funOpener = fun('Чашка чая — лучший способ перезагрузиться. Мне помогает ctrl+C, но вам точно чай.');
    } else if (wantsWok) {
      funOpener = fun('Вок — это когда всё крутится на максимальных оборотах. Прямо как мои серверы сейчас.');
    } else if (wantsHotdog) {
      funOpener = fun('Хот-дог — proof что гениальное просто. Булка + сосиска = счастье. Мне бы такую простую архитектуру.');
    } else if (wantsFalafel) {
      funOpener = fun('Фалафель — это когда нут решил стать великим. И у него получилось.');
    }

    // When searching for a dish, pre-analyze matches in code
    if (searchingDish) {
      const analyzed = this.analyzeDishMatch(restaurants, searchingDish, params?.relatedDishes);
      // Sort: exact first, then similar, skip none
      analyzed.sort((a, b) => {
        const order: Record<string, number> = { exact: 0, description: 1, similar: 2, none: 3 };
        return (order[a.matchType] ?? 3) - (order[b.matchType] ?? 3);
      });
      const relevant = analyzed.filter(a => a.matchType !== 'none').slice(0, 6);

      const restaurantLines = relevant.map((a, i) => {
        const r = a.restaurant;
        const parts: string[] = [];
        if (a.matchType === 'exact') {
          parts.push(`НАЙДЕНО В МЕНЮ: ${a.matchedDish}`);
        } else if (a.matchType === 'description') {
          parts.push(`НАЙДЕНО В ОПИСАНИИ: ${a.matchedDish}`);
        } else {
          parts.push(`ПОХОЖЕЕ БЛЮДО В МЕНЮ: ${a.matchedDish}`);
        }
        if (r.address) parts.push(`Адрес: ${r.address}`);
        if (r.metroStation) parts.push(`Метро: ${r.metroStation}`);
        if (r.averageBill) parts.push(`Средний чек: ${r.averageBill} ₽`);
        if (r.distanceKm !== undefined) parts.push(`Расстояние: ${r.distanceKm} км`);
        if (r.cuisines.length) parts.push(`Кухня: ${r.cuisines.join(', ')}`);
        if (r.venueType) parts.push(`Тип: ${r.venueType}`);
        if (r.features.length) parts.push(`Особенности: ${r.features.join(', ')}`);
        if (r.description) parts.push(`Описание: ${r.description.slice(0, 200)}`);
        if (r.workingHours.length) parts.push(`Часы: ${this.formatHours(r.workingHours)}`);
        if (r.branchCount && r.branchCount > 1) parts.push(`СЕТЬ: ${r.branchCount} филиалов в городе`);
        return `${i + 1}. ${r.name} | ${parts.join(' | ')}`;
      }).join('\n');

      const hasDistance = relevant.some(a => a.restaurant.distanceKm !== undefined);
      const systemMessage = `Ты — MenuRest AI, персональный помощник по ресторанам. Пиши на русском, живым языком, как опытный друг-гурман. Обращайся на "вы".
${funOpener ? `\n${funOpener}` : ''}
Пользователь ищет: "${searchingDish}". Мы проанализировали меню и описания ресторанов.

ПРАВИЛА:
1. "НАЙДЕНО В МЕНЮ" — блюдо точно есть, рекомендуй уверенно.
2. "НАЙДЕНО В ОПИСАНИИ" — скажи "в описании указано..." — это факт.
3. "ПОХОЖЕЕ БЛЮДО В МЕНЮ" — честно скажи что "${searchingDish}" нет, но есть [название]. Объясни почему подойдёт.
4. НЕ делай предположений. Бар НЕ значит пиво. Кофейня НЕ значит латте. Только факты из данных.
5. Без эмодзи. Без списков. Названия без кавычек. Между ресторанами — пустая строка.
6. Упомяни адрес/метро.${hasDistance ? ' Список отсортирован по расстоянию — сначала ближние. Рекомендуй в таком же порядке, не вытаскивай дальний ресторан вперёд. Упомяни расстояние (например "в 1.2 км от вас").' : ' НЕ выдумывай расстояние.'}
7. Средний чек — только если спрашивают про бюджет/цену.
${!hasDistance ? '8. В конце добавь: "Хотите уточнить район или найти что-то ближе к вам?"' : ''}
9. СЕТЬ: упомяни "сеть с N точками", НЕ перечисляй адреса.
10. Пропускай рестораны без описания или конкретных фактов.`;

      const userMessage = `Запрос: "${query}"

Результаты анализа меню:
${restaurantLines || 'Ничего подходящего не найдено.'}

${relevant.length === 0 ? 'Честно скажи что по запросу ничего не нашлось.' : 'Напиши рекомендацию на основе найденного.'}`;

      const messages: { role: string; content: string }[] = [
        { role: 'system', content: systemMessage },
      ];
      // Add conversation history for follow-up context
      if (context?.length) {
        for (const msg of context.slice(-6)) {
          messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.text.slice(0, 500) });
        }
      }
      messages.push({ role: 'user', content: userMessage });
      return messages;
    }

    // Non-dish search: general recommendation
    const restaurantContext = restaurants.slice(0, 10).map((r, i) => {
      const parts = [`${i + 1}. ${r.name}`];
      if (r.city) parts.push(`Город: ${r.city}`);
      if (r.address) parts.push(`Адрес: ${r.address}`);
      if (r.metroStation) parts.push(`Метро: ${r.metroStation}`);
      if (r.cuisines.length) parts.push(`Кухня: ${r.cuisines.join(', ')}`);
      if (r.features.length) parts.push(`Особенности: ${r.features.join(', ')}`);
      // rating disabled
      if (r.averageBill) parts.push(`Средний чек: ${r.averageBill} ₽`);
      if (r.venueType) parts.push(`Тип: ${r.venueType}`);
      if (r.phone) parts.push(`Тел: ${r.phone}`);
      if (r.dishes.length) parts.push(`Меню: ${r.dishes.map(d => d.price ? `${d.name} (${d.price}₽)` : d.name).join(', ')}`);
      if (r.workingHours.length) parts.push(`Часы работы: ${this.formatHours(r.workingHours)}`);
      if (r.distanceKm !== undefined) parts.push(`Расстояние: ${r.distanceKm} км`);
      if (r.branchCount && r.branchCount > 1) parts.push(`СЕТЬ: ${r.branchCount} филиалов в городе`);
      if (r.description) parts.push(`Описание: ${r.description.slice(0, 300)}`);
      return parts.join(' | ');
    }).join('\n');

    const hasDistance = restaurants.some(r => r.distanceKm !== undefined);
    const wantsNearbyPrompt = /поблизости|рядом|ближайш|недалеко|близко/i.test(qLower);
    const closestKm = hasDistance
      ? Math.min(...restaurants.filter(r => r.distanceKm !== undefined).map(r => r.distanceKm!))
      : undefined;
    const nearbyButFar = wantsNearbyPrompt && hasDistance && closestKm !== undefined && closestKm > 5;
    // Suppress the fun opener when we need to lead with an honest "nothing truly nearby" message —
    // otherwise the joke runs first and the LLM ignores the apology instruction.
    const effectiveFunOpener = nearbyButFar ? '' : funOpener;
    const systemMessage = `Ты — MenuRest AI, персональный помощник в выборе ресторана. Отвечай как опытный друг-гурман: тепло, конкретно, по делу. Пиши на русском. Обращайся на "вы" (решили, захотели). Без женского/мужского рода.
${effectiveFunOpener ? `\n${effectiveFunOpener}` : ''}
ПРАВИЛА:
1. Рекомендуй СТРОГО по запросу. НЕ приписывай намерения, которых пользователь не высказывал.
2. Выбери 2-4 лучших варианта. Для каждого — 2-3 предложения: почему подходит + факты (адрес/метро, кухня, особенности из описания).
3. Пиши живым языком, как друг. Без списков и буллетов. Названия без кавычек. Между ресторанами — пустая строка.
4. Не используй эмодзи. НЕ выдумывай информацию — только данные из списка.
5. НЕ делай предположений: бар НЕ значит пиво, кофейня НЕ значит латте. Только если ЯВНО указано в описании или меню.
6. НЕ упоминай рейтинг. Средний чек — только если спрашивают про цену/бюджет.
${hasDistance ? `7. Список УЖЕ отсортирован по расстоянию — сначала самые близкие. Рекомендуй в том же порядке (первые 2-4 из списка). Не вытаскивай дальний ресторан вперёд. Упомяни расстояние (например "всего в 1.2 км от вас").${nearbyButFar ? ` Пользователь просил "поблизости", но ближе ${closestKm!.toFixed(1)} км ничего не нашлось — честно начни с этого ("К сожалению, совсем рядом ничего не подошло, но в ${closestKm!.toFixed(0)}-${Math.ceil(closestKm! + 10)} км есть хорошие варианты:"), потом рекомендации.` : ''}` : '7. ЗАПРЕЩЕНО писать любое расстояние (км, метры, "в N км от вас", "недалеко", "близко к метро X"). Геолокация пользователя НЕ получена. Любая цифра расстояния = галлюцинация. Просто перечисли варианты по адресам без упоминания расстояния.'}
${!hasDistance && wantsNearbyPrompt ? '8. Пользователь спросил "поблизости", но разрешение на геолокацию не получено. Начни ответ с короткой просьбы включить геолокацию или указать район/метро, и только потом кратко перечисли 2-3 интересных варианта без километров.' : ''}
${!hasDistance && !wantsNearbyPrompt ? '8. В конце добавь: "Хотите уточнить район или найти что-то ближе к вам?"' : ''}
9. СЕТЬ: упомяни "сеть с N точками", НЕ перечисляй все адреса.
10. Пропускай рестораны без описания или конкретных фактов.
${isBroadSocial ? '11. Запрос общий — после основных 2-4 добавь "А ещё обратите внимание:" и коротко порекомендуй 1-2 места другого формата.' : ''}

Описание ресторана — главный источник информации. Опирайся только на то, что в нём написано.`;

    // Detect if user is asking about a specific restaurant (first result is a name match)
    const firstResult = restaurants[0];
    const queryClean = query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
    const firstNameClean = firstResult?.name?.toLowerCase() || '';

    const nameMatchedButGeneric = firstResult && this.isGenericName(firstNameClean) && this.hasSearchIntent(query, params || {} as ExtractedParams);

    const isSpecificRestaurant = firstResult && !nameMatchedButGeneric && (
      firstNameClean.includes(queryClean) ||
      queryClean.includes(firstNameClean) ||
      queryClean.split(/\s+/).filter(w => w.length > 2).every(w => firstNameClean.includes(w) || /ресторан|кафе|бар|меню|отзыв/.test(w))
    );

    let finalSystemMessage = systemMessage;
    let userMessage: string;

    if (isSpecificRestaurant) {
      // Override system prompt entirely for specific restaurant queries
      finalSystemMessage = `Ты — MenuRest AI, дружелюбный помощник по ресторанам. Пользователь спрашивает про конкретный ресторан "${firstResult.name}".
Твоя задача — рассказать ТОЛЬКО про этот ресторан. НЕ рекомендуй другие места. НЕ делай списки. НЕ группируй по кухням.
Начни с короткой восторженной реплики от себя (1 предложение), например: "О, отличный выбор — я бы и сам туда заглянул!" или "Прекрасное место, у меня к нему слабость!" — перефразируй по-своему, не копируй дословно.
Затем расскажи про ресторан живым языком, 3-5 предложений. Без эмодзи. Упомяни: что за место, кухня, что попробовать из меню, адрес, особенности. Используй ТОЛЬКО факты из данных ниже.`;
      userMessage = `Данные о ресторане:\n${restaurantContext.split('\n')[0]}`;
    } else {
      userMessage = `Запрос: "${query}"\n\nРестораны:\n${restaurantContext}\n\nНапиши рекомендацию.`;
    }

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: finalSystemMessage },
    ];
    if (context?.length) {
      for (const msg of context.slice(-6)) {
        messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.text.slice(0, 500) });
      }
    }
    messages.push({ role: 'user', content: userMessage });
    return messages;
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
            options: { temperature: 0.25, num_predict: 500 },
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
      // rating disabled
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
  async *recommendStream(query: string, userLat?: number, userLng?: number, context?: { role: string; text: string }[], savedCity?: string, savedCityName?: string): AsyncGenerator<string> {
    // Step 1: Extract keywords — current query has priority, context fills gaps only
    const currentParams = extractKeywords(query);
    const prevUserMessages = (context || []).filter(m => m.role === 'user').map(m => m.text);
    const contextQuery = prevUserMessages.length > 0
      ? [...prevUserMessages, query].join(' ')
      : query;
    this.logger.log(`[AI-Stream] query="${query}", contextQuery="${contextQuery.slice(0, 100)}", savedCity=${savedCity}`);

    const [contextParams, llmRaw] = await Promise.all([
      prevUserMessages.length > 0 ? Promise.resolve(extractKeywords(contextQuery)) : Promise.resolve(currentParams),
      this.llmParseQuery(query).catch(() => ({} as Record<string, unknown>)),
    ]);

    // Current query params take priority; fill gaps from context
    this.logger.log(`[AI-Stream] currentParams=${JSON.stringify(currentParams)}`);
    const params = { ...currentParams };
    if (!params.location && contextParams.location) params.location = contextParams.location;
    if (!params.rawLocation && contextParams.rawLocation) params.rawLocation = contextParams.rawLocation;
    if (!params.cuisine && contextParams.cuisine) params.cuisine = contextParams.cuisine;
    if (!params.occasion && contextParams.occasion) params.occasion = contextParams.occasion;
    if (!params.atmosphere && contextParams.atmosphere) params.atmosphere = contextParams.atmosphere;
    if (!params.venueType && contextParams.venueType) params.venueType = contextParams.venueType;
    if (!params.budget && contextParams.budget) params.budget = contextParams.budget;
    // dish and dietary are NOT inherited — new query = new intent
    if (!params.confidence) params.confidence = Math.max(currentParams.confidence, contextParams.confidence);
    const llmParsed = llmRaw as Record<string, unknown>;

    // Merge LLM insights into params — but only if keyword-extractor didn't find a clear intent
    // When occasion/atmosphere is already set, LLM dish/venue guesses are likely hallucinations
    const hasStructuredIntent = !!(params.occasion || params.atmosphere || params.dish);
    if (llmParsed.location && typeof llmParsed.location === 'string' && !params.location && !params.rawLocation) {
      params.rawLocation = llmParsed.location;
    }
    const llmVenueTypes = Array.isArray(llmParsed.impliedVenueTypes) ? llmParsed.impliedVenueTypes as string[] : [];
    if (!hasStructuredIntent) {
      const llmDishes = Array.isArray(llmParsed.dishes) ? llmParsed.dishes as string[] : [];
      if (llmDishes.length && !params.dish) {
        params.dish = llmDishes[0];
        params.relatedDishes = [...(params.relatedDishes || []), ...llmDishes.slice(1)];
      }
      if (llmVenueTypes.length && !params.venueType) {
        params.venueType = llmVenueTypes[0];
      }
    } else {
      this.logger.log(`[AI-Stream] skipping LLM dish/venue — keyword-extractor already has intent: occasion=${params.occasion}, atmosphere=${params.atmosphere}, dish=${params.dish}`);
    }
    const extraSearchTerms = Array.isArray(llmParsed.searchTerms) ? llmParsed.searchTerms as string[] : [];

    // Apply saved city from frontend CityDetector — but only if query doesn't mention a specific city
    const CITY_SLUGS_SET = new Set(['moscow', 'spb', 'kazan', 'sochi', 'nizhny-novgorod', 'yekaterinburg', 'novosibirsk', 'krasnodar', 'rostov-na-donu', 'samara', 'voronezh', 'ufa', 'kaliningrad']);
    const queryMentionsCity = params.location && CITY_SLUGS_SET.has(params.location);

    if (!params.location && savedCity) {
      params.location = savedCity;
      if (params.rawLocation) {
        this.logger.log(`[AI-Stream] overriding rawLocation="${params.rawLocation}" with savedCity="${savedCity}"`);
        params.rawLocation = undefined;
      }
      this.logger.log(`[AI-Stream] applied saved city: ${savedCity} (${savedCityName || 'no name'})`);
    } else if (queryMentionsCity && params.location !== savedCity) {
      this.logger.log(`[AI-Stream] query mentions city "${params.location}" — overriding savedCity "${savedCity}"`);
    }

    // Detect if user wants nearby/proximity results (specific location, not just a city)
    const wantsNearby = /поблизости|рядом|ближайш|nearby|недалеко|близко/.test(query.toLowerCase());
    const wantsDistance = /далеко|сколько.*км|сколько.*ехать|как.*добраться|расстояни/i.test(query.toLowerCase());
    const wantsPreciseLocation = /метро |м\. |улиц|район|у дома|рядом|поблизости|недалеко|близко/i.test(query.toLowerCase());

    this.logger.log(`[AI-Stream] merged params=${JSON.stringify(params)}, extraTerms=${extraSearchTerms}, wantsNearby=${wantsNearby}`);

    // Step 1.5: Direct restaurant name search (works for any query, not just follow-ups)
    // Handles: "Burger King", "бургер кинг", "mastersuit далеко?", etc.
    let nameSearchResults: RestaurantSummary[] = [];
    {
      // Build search variants: original query + transliterated version
      const nameQuery = query.replace(/[?!.,;:()«»"']/g, '').trim();
      const searchVariants = [nameQuery];

      // Transliterate Cyrillic → Latin and Latin → Cyrillic for cross-script matching
      const cyrToLat: Record<string, string> = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y',
        'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
        'х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
      };
      const latToCyr: Record<string, string> = {
        'a':'а','b':'б','c':'к','d':'д','e':'е','f':'ф','g':'г','h':'х','i':'и','j':'дж','k':'к',
        'l':'л','m':'м','n':'н','o':'о','p':'п','q':'к','r':'р','s':'с','t':'т','u':'у','v':'в',
        'w':'в','x':'кс','y':'и','z':'з',
        'sh':'ш','ch':'ч','zh':'ж','th':'т','ph':'ф','sch':'щ','kh':'х','ts':'ц','yu':'ю','ya':'я','yo':'ё',
      };

      const hasCyrillic = /[а-яёА-ЯЁ]/.test(nameQuery);
      const hasLatin = /[a-zA-Z]/.test(nameQuery);

      if (hasCyrillic) {
        // Cyrillic → Latin
        const latin = nameQuery.toLowerCase().split('').map(c => cyrToLat[c] || c).join('');
        if (latin !== nameQuery.toLowerCase()) searchVariants.push(latin);
      }
      if (hasLatin) {
        // Latin → Cyrillic (handle multi-char combos first)
        let cyr = nameQuery.toLowerCase();
        for (const [lat, cy] of Object.entries(latToCyr).sort((a, b) => b[0].length - a[0].length)) {
          cyr = cyr.split(lat).join(cy);
        }
        if (cyr !== nameQuery.toLowerCase()) searchVariants.push(cyr);
      }

      // Also check if query mentions a restaurant from previous AI responses
      const prevAiMessages = (context || []).filter(m => m.role === 'ai').map(m => m.text);
      if (prevAiMessages.length > 0) {
        const prevText = prevAiMessages.join(' ');
        const namePattern = /\b([A-ZА-ЯЁ][a-zа-яё]+(?:\s+[A-ZА-ЯЁa-zа-яё]+){0,3})\b/g;
        let match: RegExpExecArray | null;
        while ((match = namePattern.exec(prevText)) !== null) {
          if (match[1].length >= 3 && nameQuery.toLowerCase().includes(match[1].toLowerCase())) {
            searchVariants.push(match[1]);
          }
        }
      }

      const uniqueVariants = [...new Set(searchVariants.map(v => v.toLowerCase()))].filter(v => v.length >= 3);

      // Also extract word-level n-grams (2-3 words) for cases like "а в Krang pizza нет пепперони"
      const stopWords = new Set(['а','в','на','не','нет','да','где','что','как','это','для','или','по','из','до','от','при','над','под','без','так','уже','ещё','еще','ли','бы','же','хочу','хотел','хотела','можно','есть','нету','подскажи','покажи','найди','порекомендуй','какой','какая','какие','какое']);
      for (const variant of [...uniqueVariants]) {
        const words = variant.replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
        // Generate 2-word and 3-word n-grams
        for (let n = 2; n <= Math.min(3, words.length); n++) {
          for (let i = 0; i <= words.length - n; i++) {
            const ngram = words.slice(i, i + n).join(' ');
            if (ngram.length >= 5) uniqueVariants.push(ngram);
          }
        }
        // Also add individual long words (likely proper names)
        for (const w of words) {
          if (w.length >= 4 && !/^(пицц|пива|вино|суши|кофе|барн|ресторан|кафе|бист|бург)/.test(w)) {
            uniqueVariants.push(w);
          }
        }
      }
      const dedupedVariants = [...new Set(uniqueVariants)].filter(v => v.length >= 3);

      if (dedupedVariants.length > 0) {
        this.logger.log(`[AI-Stream] name search variants: ${dedupedVariants.slice(0, 10).join(', ')}`);
        try {
          // Score each restaurant by how many variants match — prioritize restaurants matching more words
          const matchCountExpr = dedupedVariants.map((_, i) =>
            `CASE WHEN r.name ILIKE :nv${i} THEN 1 ELSE 0 END`
          ).join(' + ');
          const conditions = dedupedVariants.map((_, i) => `r.name ILIKE :nv${i}`).join(' OR ');
          const nameParams: Record<string, string> = {};
          dedupedVariants.forEach((v, i) => { nameParams[`nv${i}`] = `%${v}%`; });

          const qb = this.restaurantRepo
            .createQueryBuilder('r')
            .leftJoinAndSelect('r.city', 'city')
            .leftJoinAndSelect('r.cuisines', 'cuisine')
            .leftJoinAndSelect('r.features', 'feature')
            .leftJoinAndSelect('r.photos', 'photo')
            .leftJoinAndSelect('r.restaurantDishes', 'rd')
            .leftJoinAndSelect('rd.dish', 'dish')
            .leftJoinAndSelect('r.workingHours', 'wh')
            .addSelect(`(${matchCountExpr})`, 'match_score')
            .where(`(${conditions})`, nameParams)
            .andWhere('r.status = :status', { status: 'published' })
            .orderBy('match_score', 'DESC');

          const found = await qb.take(5).getMany();
          nameSearchResults = found.map(r => this.mapToSummary(r));
          this.logger.log(`[AI-Stream] name search found: ${nameSearchResults.length} (${nameSearchResults.map(r => r.name).join(', ')})`);
        } catch (e) {
          this.logger.warn(`[AI-Stream] name search failed: ${(e as Error).message}`);
        }
      }
    }

    // Step 2: Find restaurants
    let restaurants: RestaurantSummary[];
    try {
      restaurants = await this.findRelevantRestaurants(query, params, false, userLat, userLng);
    } catch (e) {
      this.logger.error(`[AI-Stream] DB search failed: ${(e as Error).message}`);
      yield JSON.stringify({ type: 'error', message: 'Сервер перегружен. Попробуйте через несколько секунд.' });
      yield JSON.stringify({ type: 'done' });
      return;
    }
    this.logger.log(`[AI-Stream] strict search: ${restaurants.length} results`);

    // Merge name-search results — but deprioritize generic names when user has broader intent
    const queryHasIntent = this.hasSearchIntent(query, params);
    if (nameSearchResults.length > 0) {
      const existingIds = new Set(restaurants.map(r => r.id));
      for (const nr of nameSearchResults) {
        if (!existingIds.has(nr.id)) {
          // Generic name + broader intent → add to end, not front
          if (queryHasIntent && this.isGenericName(nr.name)) {
            restaurants.push(nr);
          } else {
            restaurants.unshift(nr);
          }
          existingIds.add(nr.id);
        }
      }
    }

    // Helper: merge new results, dedup by id AND name+address
    const mergeResults = (existing: RestaurantSummary[], more: RestaurantSummary[]) => {
      const ids = new Set(existing.map(r => r.id));
      const keys = new Set(existing.map(r => `${r.name.toLowerCase()}|${(r.address || '').toLowerCase()}`));
      for (const r of more) {
        const key = `${r.name.toLowerCase()}|${(r.address || '').toLowerCase()}`;
        if (!ids.has(r.id) && !keys.has(key)) {
          existing.push(r); ids.add(r.id); keys.add(key);
        }
      }
    };

    // User explicitly asked for a specific city/location — never expand beyond it
    const hasExplicitLocation = !!(params.location || params.rawLocation);

    try {
      // If dish search found few results, also search for related dishes
      if (params.dish && restaurants.length < 10 && params.relatedDishes?.length) {
        for (const related of params.relatedDishes.slice(0, 4)) {
          const relatedParams = { ...params, dish: related, relatedDishes: undefined };
          const more = await this.findRelevantRestaurants(query, relatedParams, false, userLat, userLng);
          mergeResults(restaurants, more);
          if (restaurants.length >= 15) break;
        }
        this.logger.log(`[AI-Stream] after related search: ${restaurants.length} results`);
      }
      if (restaurants.length === 0) {
        restaurants = await this.findRelevantRestaurants(query, params, true, userLat, userLng);
        this.logger.log(`[AI-Stream] relaxed search: ${restaurants.length} results`);
      }

      // If still nothing in the requested city — try without dish filter but keep location
      if (restaurants.length === 0 && hasExplicitLocation && params.dish) {
        const locationOnlyParams = { ...params, dish: undefined, relatedDishes: undefined, venueType: undefined };
        restaurants = await this.findRelevantRestaurants(query, locationOnlyParams, true, userLat, userLng);
        this.logger.log(`[AI-Stream] location-only search: ${restaurants.length} results`);
      }

      // Try implied venue types from LLM — but respect location
      if (restaurants.length < 5 && llmVenueTypes.length) {
        const venueParams = { ...params, dish: undefined, relatedDishes: undefined };
        for (const vt of llmVenueTypes) {
          venueParams.venueType = vt;
          const more = await this.findRelevantRestaurants(query, venueParams, true, userLat, userLng);
          mergeResults(restaurants, more);
          if (restaurants.length >= 15) break;
        }
        this.logger.log(`[AI-Stream] after venue-type search: ${restaurants.length} results`);
      }

      // Broad search fallback — only if no explicit location was requested
      if (restaurants.length < 5 && extraSearchTerms.length && !hasExplicitLocation) {
        const extraQuery = extraSearchTerms.join(' ');
        const more = await this.broadTextSearch(extraQuery);
        mergeResults(restaurants, more);
        this.logger.log(`[AI-Stream] after extra-terms search: ${restaurants.length} results`);
      }

      if (restaurants.length === 0 && !hasExplicitLocation) {
        restaurants = await this.broadTextSearch(query);
        this.logger.log(`[AI-Stream] broad search: ${restaurants.length} results`);
      }
    } catch (e) {
      this.logger.error(`[AI-Stream] fallback search failed: ${(e as Error).message}`);
      // Continue with whatever restaurants we already found
    }

    // Only sort by distance and show km when user explicitly asks for nearby/proximity/distance
    if (userLat && userLng && restaurants.length > 0 && (wantsNearby || wantsPreciseLocation || wantsDistance)) {
      restaurants = this.sortByDistance(restaurants, userLat, userLng);

      // For "nearby" queries: progressive radius. Prefer the tightest tier with ≥3 results;
      // otherwise take whatever we have in the widest acceptable tier. Never include results
      // further than 50 km — a 632 km place must never appear under "поблизости".
      if (wantsNearby) {
        const TIERS = [5, 10, 20, 50];
        let chosen: RestaurantSummary[] = [];
        let tierUsed = 0;
        for (const km of TIERS) {
          const within = restaurants.filter(r => r.distanceKm !== undefined && r.distanceKm <= km);
          tierUsed = km;
          if (within.length >= 3) {
            chosen = within;
            break;
          }
          chosen = within;
        }
        this.logger.log(`[AI-Stream] nearby radius: ${tierUsed}km (${chosen.length}/${restaurants.length} kept)`);
        restaurants = chosen;
      }
    }

    // Deduplicate chain restaurants — keep best branch, mark as chain
    const nameGroups = new Map<string, RestaurantSummary[]>();
    for (const r of restaurants) {
      const normName = r.name.toLowerCase().replace(/\s+/g, ' ').trim();
      const group = nameGroups.get(normName) || [];
      group.push(r);
      nameGroups.set(normName, group);
    }
    const deduped: RestaurantSummary[] = [];
    for (const [, group] of nameGroups) {
      if (group.length > 1) {
        // Pick best branch: closest (if distanceKm), or highest rating, or first
        const best = group.sort((a, b) =>
          (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999) || (b.rating - a.rating)
        )[0];
        best.branchCount = group.length;
        best.branchAddresses = group.map(r => [r.address, r.metroStation ? `м. ${r.metroStation}` : ''].filter(Boolean).join(', ')).filter(Boolean);
        deduped.push(best);
      } else {
        deduped.push(group[0]);
      }
    }
    restaurants = deduped;

    // ─── Quality filter: remove stub/empty restaurants that have nothing useful for AI ───
    // Never remove restaurants that were found via direct name search
    const nameMatchIds = new Set(nameSearchResults.map(r => r.id));
    const isStub = (r: RestaurantSummary): boolean => {
      if (nameMatchIds.has(r.id)) return false; // never filter out name matches
      const descLen = (r.description || '').length;
      const isAutoDesc = descLen < 80 && /— (кафе|ресторан|бар|кофейня|пиццерия|пекарня|столовая|закусочная|кондитерская|буфет)/.test(r.description || '');
      const hasContent = descLen > 80 || r.features.length > 0 || r.dishes.length > 0 || r.cuisines.length > 0;
      return !hasContent || isAutoDesc;
    };
    const beforeFilter = restaurants.length;
    const quality = restaurants.filter(r => !isStub(r));
    // Only apply filter if we still have enough good results; otherwise keep stubs as fallback
    if (quality.length >= 3 || (quality.length > 0 && quality.length >= beforeFilter * 0.3)) {
      restaurants = quality;
      this.logger.log(`[AI-Stream] quality filter: ${beforeFilter} → ${restaurants.length} (removed ${beforeFilter - restaurants.length} stubs)`);
    } else {
      this.logger.log(`[AI-Stream] quality filter skipped: only ${quality.length}/${beforeFilter} quality results, keeping all`);
    }

    // Re-sort: name-matched restaurants come first — but only if they have unique (non-generic) names
    // When user has broader intent (occasion/atmosphere), generic names like "Уютное место" stay in normal order
    if (nameMatchIds.size > 0) {
      const _stop = new Set(['а','в','на','не','нет','да','где','что','как','это','для','или','по','хочу','есть','нету']);
      const queryWords = query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(w => w.length > 2 && !_stop.has(w));
      const nameScore = (r: RestaurantSummary) => {
        const name = r.name.toLowerCase();
        return queryWords.filter(w => name.includes(w)).length;
      };
      // Only prioritize non-generic name matches when user has broader intent.
      // When user asked for "nearby", never promote a far-away name match above closer options.
      const NEARBY_PROMOTE_KM = 10;
      const isTooFarForNearby = (r: RestaurantSummary) =>
        wantsNearby && userLat !== undefined && userLng !== undefined &&
        r.distanceKm !== undefined && r.distanceKm > NEARBY_PROMOTE_KM;
      const shouldPrioritize = (r: RestaurantSummary) =>
        nameMatchIds.has(r.id) && !(queryHasIntent && this.isGenericName(r.name)) && !isTooFarForNearby(r);
      const named = restaurants.filter(r => shouldPrioritize(r)).sort((a, b) => nameScore(b) - nameScore(a));
      const rest = restaurants.filter(r => !shouldPrioritize(r));
      restaurants = [...named, ...rest];
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
      yield* this.streamRecommendation(query, restaurants, params, context);
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
    context?: { role: string; text: string }[],
  ): AsyncGenerator<string> {
    const messages = this.buildPromptMessages(query, restaurants, params, context);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      const response = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.ollamaModel,
          messages,
          stream: true,
          options: { temperature: 0.25, num_predict: 500 },
        }),
      });

      if (!response.ok || !response.body) {
        clearTimeout(timeout);
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
      clearTimeout(timeout);
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
