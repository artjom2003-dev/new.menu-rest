import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTasteProfile } from '@database/entities/user-taste-profile.entity';
import { Restaurant } from '@database/entities/restaurant.entity';
import {
  QUIZ_QUESTIONS, ARCHETYPES, ALL_AXES,
  QuizQuestion, Archetype, TasteAxis,
} from './gastro.constants';

// Cuisine → axis score hints (rough heuristic until LLM-based vectors exist)
const CUISINE_AXES: Record<string, Partial<Record<string, number>>> = {
  'Японская': { adventure: 6, intensity: 4, health_vector: 7, visual_weight: 8, foodie_level: 7 },
  'Итальянская': { adventure: 3, intensity: 5, sweet_tooth: 5, social_context: 7, foodie_level: 6 },
  'Грузинская': { intensity: 7, protein_focus: 7, social_context: 8, meal_tempo: 6, adventure: 5 },
  'Французская': { price_tolerance: 8, visual_weight: 9, foodie_level: 9, alcohol_profile: 8, meal_tempo: 7 },
  'Узбекская': { intensity: 6, protein_focus: 8, social_context: 7, price_tolerance: 3 },
  'Китайская': { adventure: 5, intensity: 7, texture_pref: 5, price_tolerance: 3 },
  'Индийская': { adventure: 7, intensity: 9, health_vector: 5, price_tolerance: 4 },
  'Мексиканская': { adventure: 6, intensity: 8, social_context: 7, price_tolerance: 4 },
  'Американская': { protein_focus: 7, social_context: 6, price_tolerance: 4, sweet_tooth: 6 },
  'Средиземноморская': { health_vector: 7, adventure: 5, visual_weight: 6, alcohol_profile: 6 },
  'Кавказская': { intensity: 7, protein_focus: 8, social_context: 8, meal_tempo: 6 },
  'Европейская': { foodie_level: 5, visual_weight: 5, price_tolerance: 5, social_context: 5 },
  'Паназиатская': { adventure: 7, intensity: 6, visual_weight: 7, health_vector: 5, foodie_level: 7 },
  'Авторская': { adventure: 8, price_tolerance: 8, visual_weight: 9, foodie_level: 9, meal_tempo: 7 },
  'Русская': { adventure: 2, intensity: 4, protein_focus: 6, social_context: 5, price_tolerance: 3 },
  'Вегетарианская': { health_vector: 9, protein_focus: 1, adventure: 5, foodie_level: 6 },
  'Морепродукты': { adventure: 6, health_vector: 6, price_tolerance: 7, alcohol_profile: 6, visual_weight: 7 },
};

const VENUE_AXES: Record<string, Partial<Record<string, number>>> = {
  'restaurant': { meal_tempo: 6, social_context: 6, price_tolerance: 5, visual_weight: 5 },
  'cafe': { meal_tempo: 4, social_context: 4, price_tolerance: 3, sweet_tooth: 5 },
  'bar': { alcohol_profile: 8, social_context: 7, meal_tempo: 5 },
  'coffeehouse': { meal_tempo: 2, sweet_tooth: 6, social_context: 3, price_tolerance: 2 },
  'canteen': { price_tolerance: 1, meal_tempo: 1, visual_weight: 1 },
  'wine-bar': { alcohol_profile: 9, foodie_level: 7, price_tolerance: 7, visual_weight: 7 },
  'lounge': { visual_weight: 8, social_context: 8, meal_tempo: 7, alcohol_profile: 7, price_tolerance: 7 },
  'fastfood': { meal_tempo: 1, price_tolerance: 1, social_context: 3 },
  'pizzeria': { social_context: 6, sweet_tooth: 3, price_tolerance: 3 },
  'bakery': { sweet_tooth: 7, meal_tempo: 2, price_tolerance: 2 },
};

@Injectable()
export class GastroService {
  constructor(
    @InjectRepository(UserTasteProfile)
    private readonly profileRepo: Repository<UserTasteProfile>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
  ) {}

  /** Return all quiz questions */
  getQuestions(): QuizQuestion[] {
    return QUIZ_QUESTIONS;
  }

  /** Submit quiz answers, compute profile, upsert */
  async submitQuiz(
    userId: number,
    answers: Record<number, number[]>,
  ): Promise<UserTasteProfile> {
    // 1. Accumulate raw axis scores
    const rawScores: Record<string, number> = {};
    for (const axis of ALL_AXES) rawScores[axis] = 0;

    const dietary: string[] = [];

    for (const [qIdStr, selectedIndices] of Object.entries(answers)) {
      const qId = Number(qIdStr);
      const question = QUIZ_QUESTIONS.find((q) => q.id === qId);
      if (!question) continue;

      for (const idx of selectedIndices) {
        const option = question.options[idx];
        if (!option) continue;

        for (const [axis, score] of Object.entries(option.axisContributions)) {
          rawScores[axis] = (rawScores[axis] ?? 0) + (score as number);
        }

        if (option.dietary && !dietary.includes(option.dietary)) {
          dietary.push(option.dietary);
        }
      }
    }

    // 2. Normalize to 0-10
    const axes: Record<string, number> = {};
    const values = Object.values(rawScores);
    const maxRaw = Math.max(...values, 1);
    const minRaw = Math.min(...values, 0);
    const range = maxRaw - minRaw || 1;

    for (const axis of ALL_AXES) {
      const normalized = ((rawScores[axis] - minRaw) / range) * 10;
      axes[axis] = Math.round(normalized * 10) / 10; // one decimal
    }

    // 3. Determine archetype
    const archetype = this.determineArchetype(axes);

    // 4. Upsert profile
    let profile = await this.profileRepo.findOne({ where: { userId } });

    if (profile) {
      profile.axes = axes;
      profile.archetype = archetype.key;
      profile.dietary = dietary;
      profile.rawAnswers = answers as unknown as Record<string, number[]>;
      profile.winePrefs = this.extractWinePrefs(axes);
    } else {
      profile = this.profileRepo.create({
        userId,
        axes,
        archetype: archetype.key,
        dietary,
        rawAnswers: answers as unknown as Record<string, number[]>,
        winePrefs: this.extractWinePrefs(axes),
      });
    }

    const saved = await this.profileRepo.save(profile);

    return {
      ...saved,
      archetype: archetype.key,
      // Attach archetype details for frontend convenience
      ...(({ key, ...rest }) => rest)(archetype) as any,
    };
  }

  /** Get user's taste profile */
  async getProfile(userId: number): Promise<(UserTasteProfile & { archetypeInfo?: Archetype }) | null> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) return null;

    const archetype = ARCHETYPES.find((a) => a.key === profile.archetype) ?? null;
    return { ...profile, archetypeInfo: archetype ?? undefined };
  }

  /** Recommend restaurants based on user's gastro profile */
  async getRecoRestaurants(userId: number, city?: string, limit = 12) {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) return { items: [], message: 'Пройдите гастро-квиз для персональных рекомендаций' };

    const userAxes = profile.axes as Record<string, number>;

    // Build query
    const qb = this.restaurantRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.cuisines', 'c')
      .leftJoinAndSelect('r.city', 'city')
      .leftJoinAndSelect('r.photos', 'photos')
      .where("r.status = 'published'");

    if (city) {
      qb.andWhere('city.slug = :city', { city });
    }

    // Prefer restaurants with descriptions and photos
    qb.andWhere('r.description IS NOT NULL');
    qb.andWhere('r.description != :empty', { empty: '' });

    // Count with the same filters for proper random offset
    const countQb = this.restaurantRepo
      .createQueryBuilder('r')
      .leftJoin('r.city', 'city')
      .where("r.status = 'published'")
      .andWhere('r.description IS NOT NULL')
      .andWhere('r.description != :empty', { empty: '' });
    if (city) countQb.andWhere('city.slug = :city', { city });
    const total = await countQb.getCount();

    const maxOffset = Math.max(0, total - 500);
    const randomOffset = maxOffset > 0 ? Math.floor(Math.random() * maxOffset) : 0;
    qb.skip(randomOffset);

    const restaurants = await qb.take(500).getMany();

    // Score each restaurant
    const scored = restaurants.map(r => {
      let score = 0;
      let axisCount = 0;

      // 1. Cuisine match (weight: 0.5)
      const cuisineVec: Record<string, number> = {};
      for (const cuisine of (r.cuisines || [])) {
        const hints = CUISINE_AXES[cuisine.name];
        if (hints) {
          for (const [axis, val] of Object.entries(hints)) {
            cuisineVec[axis] = Math.max(cuisineVec[axis] || 0, val ?? 0);
          }
        }
      }

      // 2. Venue type match (weight: 0.2)
      const venueVec = VENUE_AXES[r.venueType || ''] || {};

      // 3. Price match (weight: 0.15)
      const priceAxis = userAxes['price_tolerance'] || 5;
      const restPrice = r.priceLevel || 2;
      const priceDiff = Math.abs((restPrice / 4) * 10 - priceAxis);
      const priceScore = Math.max(0, 10 - priceDiff * 2);

      // Combine vectors
      const entityVec: Record<string, number> = {};
      for (const axis of ALL_AXES) {
        entityVec[axis] = (cuisineVec[axis] || 5) * 0.5 + (venueVec[axis] || 5) * 0.2 + 5 * 0.3;
      }

      // Cosine similarity
      let dotProduct = 0, normA = 0, normB = 0;
      for (const axis of ALL_AXES) {
        const a = userAxes[axis] || 5;
        const b = entityVec[axis] || 5;
        dotProduct += a * b;
        normA += a * a;
        normB += b * b;
        axisCount++;
      }
      const cosineSim = normA && normB ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;

      // Photos boost
      const hasPhotos = r.photos && r.photos.length > 0 ? 1 : 0;

      // Final score
      score = cosineSim * 0.5 + priceScore / 10 * 0.15 + (r.rating || 0) / 5 * 0.1 + hasPhotos * 0.1 + (r.reviewCount > 0 ? 0.05 : 0) + ((r as any).averageBill ? 0.05 : 0);

      // Generate match explanation
      const topMatches: string[] = [];
      for (const axis of ALL_AXES) {
        if ((userAxes[axis] || 0) >= 7 && (entityVec[axis] || 0) >= 6) {
          const labels: Record<string, string> = {
            price_tolerance: 'ваш ценовой уровень',
            adventure: 'любовь к новому',
            intensity: 'яркие вкусы',
            texture_pref: 'текстуры',
            protein_focus: 'мясные блюда',
            social_context: 'атмосфера для компании',
            meal_tempo: 'неспешная трапеза',
            visual_weight: 'красивая подача',
            alcohol_profile: 'винная карта',
            sweet_tooth: 'десерты',
            health_vector: 'здоровое питание',
            foodie_level: 'гастрономический уровень',
          };
          topMatches.push(labels[axis] || axis);
        }
      }

      const matchPercent = Math.round(cosineSim * 100);

      return {
        ...r,
        matchPercent: Math.min(98, Math.max(60, matchPercent)),
        matchReason: topMatches.length > 0
          ? `Совпадение: ${topMatches.slice(0, 3).join(', ')}`
          : 'Подходит по вашему профилю',
        _score: score,
      };
    });

    // Sort by score, return top N
    scored.sort((a, b) => b._score - a._score);
    const items = scored.slice(0, limit).map(({ _score, ...rest }) => rest);

    return { items };
  }

  /** Find archetype whose dominant axes best match the user's top scores */
  private determineArchetype(axes: Record<string, number>): Archetype {
    let bestArchetype = ARCHETYPES[6]; // Universal as default
    let bestScore = -Infinity;

    for (const arch of ARCHETYPES) {
      let score = 0;
      for (const axis of arch.dominantAxes) {
        score += axes[axis] ?? 0;
      }
      // Normalize by number of dominant axes for fair comparison
      score /= arch.dominantAxes.length;

      if (score > bestScore) {
        bestScore = score;
        bestArchetype = arch;
      }
    }

    return bestArchetype;
  }

  /** Derive simple wine preferences from axes */
  private extractWinePrefs(axes: Record<string, number>): Record<string, any> | null {
    if ((axes['alcohol_profile'] ?? 0) < 3) return null;

    return {
      prefersRed: (axes['intensity'] ?? 0) > 5 || (axes['protein_focus'] ?? 0) > 5,
      prefersWhite: (axes['health_vector'] ?? 0) > 5 || (axes['sweet_tooth'] ?? 0) > 5,
      prefersSparkling: (axes['social_context'] ?? 0) > 6,
      adventurous: (axes['adventure'] ?? 0) > 5,
    };
  }
}
