import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractKeywords, ExtractedParams } from './keyword-extractor';

// Redis кеш через ioredis (простая интеграция)
import Redis from 'ioredis';

const NLU_PROMPT = `Ты — парсер поисковых запросов ресторанного агрегатора Menu-Rest.
Извлеки структурированные параметры из запроса пользователя.
Верни ТОЛЬКО валидный JSON без пояснений и markdown.

Поля:
- location: string | null — район, улица, станция метро, город
- cuisine: string | null — тип кухни на английском (italian, japanese, georgian, french, russian, uzbek, steakhouse, seafood, pan-asian, chinese, american, mediterranean, vegetarian, fusion)
- dish: string | null — конкретное блюдо
- dietary: string[] — диетические ограничения (vegan, vegetarian, gluten-free, halal, kosher, healthy, nut-free, lactose-free)
- budget: { max: number, per: "person" | "couple" } | null — бюджет в рублях
- occasion: string | null — повод (romantic, birthday, business, friends, kids, banquet)
- atmosphere: string | null — атмосфера (cozy, with-view, live-music, terrace, quiet, rooftop)
- venue_type: string | null — тип заведения (restaurant, cafe, bar, coffeehouse, gastropub)

Запрос: "{query}"`;

@Injectable()
export class AiSearchService {
  private readonly logger = new Logger(AiSearchService.name);
  private gemini: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;
  private redis: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey !== 'CHANGE_ME') {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.gemini = genAI.getGenerativeModel({
        model: config.get('GEMINI_MODEL', 'gemini-2.0-flash'),
      });
    }

    try {
      this.redis = new Redis({
        host: config.get('REDIS_HOST', 'localhost'),
        port: config.get<number>('REDIS_PORT', 6379),
        password: config.get('REDIS_PASSWORD') || undefined,
        lazyConnect: true,
      });
    } catch {
      this.logger.warn('Redis недоступен, кеш AI-поиска отключён');
    }
  }

  /**
   * Основная точка входа.
   * 1. Keyword extractor (быстрый, бесплатный)
   * 2. Если confidence < 0.8 → LLM
   * 3. Redis кеш
   */
  async parse(query: string): Promise<ExtractedParams & { source: 'keywords' | 'llm' | 'cache' }> {
    const cacheKey = `ai:search:${Buffer.from(query.toLowerCase().trim()).toString('base64').slice(0, 64)}`;

    // Проверка кеша
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return { ...JSON.parse(cached), source: 'cache' };
        }
      } catch { /* Redis недоступен */ }
    }

    // Первый проход: keyword extractor
    const extracted = extractKeywords(query);

    if (extracted.confidence >= 0.8 || !this.gemini) {
      return { ...extracted, source: 'keywords' };
    }

    // Второй проход: Gemini NLU
    try {
      const timeout = this.config.get<number>('GEMINI_TIMEOUT_MS', 2000);
      const prompt = NLU_PROMPT.replace('{query}', query);

      const result = await Promise.race([
        this.gemini.generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('LLM timeout')), timeout)
        ),
      ]);

      const text = (result as Awaited<ReturnType<typeof this.gemini.generateContent>>)
        .response.text()
        .replace(/```json\n?|\n?```/g, '')
        .trim();

      const llmParams = JSON.parse(text);

      const merged: ExtractedParams = {
        location: llmParams.location || extracted.location,
        cuisine: llmParams.cuisine || extracted.cuisine,
        dietary: llmParams.dietary?.length ? llmParams.dietary : extracted.dietary,
        budget: llmParams.budget || extracted.budget,
        occasion: llmParams.occasion || extracted.occasion,
        atmosphere: llmParams.atmosphere || extracted.atmosphere,
        venueType: llmParams.venue_type || extracted.venueType,
        confidence: 0.95,
      };

      // Кешируем на 1 час
      if (this.redis) {
        try {
          const ttl = this.config.get<number>('AI_CACHE_TTL', 3600);
          await this.redis.setex(cacheKey, ttl, JSON.stringify(merged));
        } catch { /* Redis недоступен */ }
      }

      return { ...merged, source: 'llm' };

    } catch (err) {
      this.logger.warn(`LLM fallback: ${(err as Error).message}`);
      return { ...extracted, source: 'keywords' };
    }
  }
}
