import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '@database/entities/restaurant.entity';
import { AiSearchService, AiRecommendation } from './ai-search.service';
import { ExtractedParams } from './keyword-extractor';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly es: Client;
  private readonly index: string;

  constructor(
    private readonly config: ConfigService,
    private readonly aiSearch: AiSearchService,
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
  ) {
    this.es = new Client({ node: config.get('ES_HOST', 'http://localhost:9200') });
    this.index = config.get('ES_INDEX_RESTAURANTS', 'restaurants');
  }

  /** AI-ассистент: RAG-поиск с рекомендациями */
  async aiSearch_query(query: string): Promise<AiRecommendation> {
    return this.aiSearch.recommend(query);
  }

  /** Стандартный поиск с фильтрами */
  async search(filters: {
    q?: string;
    city?: string;
    cuisine?: string;
    diet?: string;
    priceMax?: number;
    lat?: number;
    lng?: number;
    page?: number;
    limit?: number;
  }) {
    const { q, city, cuisine, diet, priceMax, lat, lng, page = 1, limit = 20 } = filters;

    const must: object[] = [];
    const filter: object[] = [{ term: { status: 'published' } }];

    if (q) {
      must.push({
        multi_match: {
          query: q,
          fields: ['name^3', 'description', 'dishes.name^2'],
          analyzer: 'russian',
          fuzziness: 'AUTO',
        },
      });
    }

    if (city) filter.push({ term: { city } });
    if (cuisine) filter.push({ term: { cuisines: cuisine } });
    if (diet) filter.push({ term: { features: diet } });
    if (priceMax) filter.push({ range: { average_bill_max: { lte: priceMax } } });

    const body: Record<string, unknown> = {
      query: { bool: { must: must.length ? must : [{ match_all: {} }], filter } },
      from: (page - 1) * limit,
      size: limit,
    };

    // Геопоиск
    if (lat && lng) {
      body.sort = [
        { _geo_distance: { location: { lat, lon: lng }, order: 'asc', unit: 'km' } },
        { _score: { order: 'desc' } },
      ];
    } else {
      body.sort = [{ rating: { order: 'desc' } }];
    }

    try {
      const response = await this.es.search({ index: this.index, body });
      return {
        total: response.hits.total,
        items: response.hits.hits.map((h) => ({ id: h._id, ...(h._source as object) })),
      };
    } catch (err) {
      this.logger.error('Search error:', err);
      return { total: 0, items: [] };
    }
  }

  /** Автодополнение */
  async autocomplete(q: string) {
    try {
      const response = await this.es.search({
        index: this.index,
        body: {
          suggest: {
            name_suggest: {
              prefix: q,
              completion: { field: 'suggest', size: 8, skip_duplicates: true },
            },
          },
          _source: ['name', 'slug', 'cuisines', 'city'],
          size: 0,
        },
      });

      const suggestions = (response.suggest?.name_suggest?.[0]?.options ?? []) as unknown as Record<string, unknown>[];
      return suggestions.map((s) => ({
        text: s['text'],
        slug: (s['_source'] as Record<string, unknown>)?.['slug'],
        ...(s['_source'] as object),
      }));
    } catch {
      return [];
    }
  }

  /** Создать индекс Elasticsearch (запускается один раз при старте) */
  async ensureIndex() {
    try {
      const exists = await this.es.indices.exists({ index: this.index });
      if (exists) return;

      await this.es.indices.create({
        index: this.index,
        body: {
          settings: {
            analysis: {
              analyzer: {
                russian: { type: 'custom', tokenizer: 'standard', filter: ['lowercase', 'russian_stop', 'russian_stemmer'] },
              },
              filter: {
                russian_stop: { type: 'stop', stopwords: '_russian_' },
                russian_stemmer: { type: 'stemmer', language: 'russian' },
              },
            },
          },
          mappings: {
            properties: {
              id: { type: 'integer' },
              name: { type: 'text', analyzer: 'russian' },
              slug: { type: 'keyword' },
              description: { type: 'text', analyzer: 'russian' },
              city: { type: 'keyword' },
              district: { type: 'keyword' },
              location: { type: 'geo_point' },
              cuisines: { type: 'keyword' },
              features: { type: 'keyword' },
              price_level: { type: 'integer' },
              average_bill_min: { type: 'integer' },
              average_bill_max: { type: 'integer' },
              rating: { type: 'float' },
              review_count: { type: 'integer' },
              status: { type: 'keyword' },
              suggest: { type: 'completion', analyzer: 'simple' },
              dishes: {
                type: 'nested',
                properties: {
                  name: { type: 'text', analyzer: 'russian' },
                  price: { type: 'integer' },
                  allergens: { type: 'keyword' },
                  calories: { type: 'integer' },
                },
              },
            },
          },
        },
      });

      this.logger.log(`✅ Elasticsearch index '${this.index}' создан`);
    } catch (err) {
      this.logger.warn(`Elasticsearch недоступен: ${(err as Error).message}`);
    }
  }

  // ─── Indexing ─────────────────────────────────────────

  /** Index a single restaurant into ES */
  async indexRestaurant(id: number) {
    const r = await this.restaurantRepo.findOne({
      where: { id },
      relations: ['city', 'cuisines', 'features', 'restaurantDishes', 'restaurantDishes.dish'],
    });
    if (!r) return;

    const doc = {
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      city: r.city?.slug,
      location: r.lat && r.lng ? { lat: Number(r.lat), lon: Number(r.lng) } : undefined,
      cuisines: r.cuisines?.map(c => c.slug) || [],
      features: r.features?.map(f => f.slug) || [],
      price_level: r.priceLevel,
      average_bill_min: r.averageBill,
      average_bill_max: r.averageBill,
      rating: Number(r.rating),
      review_count: r.reviewCount,
      status: r.status,
      suggest: { input: [r.name, ...(r.cuisines?.map(c => c.name) || [])] },
      dishes: r.restaurantDishes?.map(rd => ({
        name: rd.dish?.name,
        price: rd.price,
        calories: rd.dish?.calories,
      })) || [],
    };

    try {
      await this.es.index({ index: this.index, id: String(r.id), body: doc });
    } catch (err) {
      this.logger.warn(`ES index failed for restaurant #${id}: ${(err as Error).message}`);
    }
  }

  /** Remove a restaurant from ES */
  async removeFromIndex(id: number) {
    try {
      await this.es.delete({ index: this.index, id: String(id) });
    } catch { /* may not exist */ }
  }

  /** Bulk reindex all published restaurants */
  async reindexAll() {
    const restaurants = await this.restaurantRepo.find({
      where: { status: 'published' as const },
      relations: ['city', 'cuisines', 'features', 'restaurantDishes', 'restaurantDishes.dish'],
    });

    if (!restaurants.length) {
      this.logger.log('No published restaurants to index');
      return 0;
    }

    const body = restaurants.flatMap(r => [
      { index: { _index: this.index, _id: String(r.id) } },
      {
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        city: r.city?.slug,
        location: r.lat && r.lng ? { lat: Number(r.lat), lon: Number(r.lng) } : undefined,
        cuisines: r.cuisines?.map(c => c.slug) || [],
        features: r.features?.map(f => f.slug) || [],
        price_level: r.priceLevel,
        average_bill_min: r.averageBill,
        average_bill_max: r.averageBill,
        rating: Number(r.rating),
        review_count: r.reviewCount,
        status: r.status,
        suggest: { input: [r.name, ...(r.cuisines?.map(c => c.name) || [])] },
        dishes: r.restaurantDishes?.map(rd => ({
          name: rd.dish?.name,
          price: rd.price,
          calories: rd.dish?.calories,
        })) || [],
      },
    ]);

    try {
      const result = await this.es.bulk({ body });
      const indexed = restaurants.length;
      const errors = result.errors ? result.items.filter((i: Record<string, { error?: unknown }>) => i.index?.error).length : 0;
      this.logger.log(`Reindexed ${indexed - errors}/${indexed} restaurants${errors ? ` (${errors} errors)` : ''}`);
      return indexed - errors;
    } catch (err) {
      this.logger.error(`Bulk reindex failed: ${(err as Error).message}`);
      return 0;
    }
  }

  private buildEsQuery(params: ExtractedParams): Record<string, unknown> {
    const must: object[] = [];
    const filter: object[] = [{ term: { status: 'published' } }];

    if (params.cuisine) filter.push({ term: { cuisines: params.cuisine } });
    if (params.location) filter.push({ term: { city: params.location } });
    if (params.occasion) filter.push({ term: { features: params.occasion } });
    if (params.atmosphere) filter.push({ term: { features: params.atmosphere } });
    if (params.venueType) filter.push({ term: { features: params.venueType } });

    if (params.dietary?.length) {
      params.dietary.forEach((d) => filter.push({ term: { features: d } }));
    }

    if (params.budget) {
      filter.push({ range: { average_bill_max: { lte: params.budget.max } } });
    }

    // Text search for dish names or general query terms
    if (params.dish) {
      must.push({
        multi_match: {
          query: params.dish,
          fields: ['dishes.name^3', 'description', 'name'],
          analyzer: 'russian',
          fuzziness: 'AUTO',
        },
      });
    }

    return {
      query: { bool: { must: must.length ? must : [{ match_all: {} }], filter } },
      sort: must.length ? [{ _score: { order: 'desc' } }, { rating: { order: 'desc' } }] : [{ rating: { order: 'desc' } }],
    };
  }
}
