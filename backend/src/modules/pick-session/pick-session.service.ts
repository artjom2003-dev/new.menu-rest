import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PickSession } from '@database/entities/pick-session.entity';
import { PickVote } from '@database/entities/pick-vote.entity';
import { Conversation } from '@database/entities/conversation.entity';
import { Restaurant } from '@database/entities/restaurant.entity';

@Injectable()
export class PickSessionService {
  constructor(
    @InjectRepository(PickSession) private readonly sessionRepo: Repository<PickSession>,
    @InjectRepository(PickVote) private readonly voteRepo: Repository<PickVote>,
    @InjectRepository(Conversation) private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Restaurant) private readonly restRepo: Repository<Restaurant>,
  ) {}

  private async validateParticipant(conversationId: number, userId: number) {
    const conv = await this.convRepo.findOneBy({ id: conversationId });
    if (!conv) throw new NotFoundException('Диалог не найден');
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      throw new ForbiddenException('Нет доступа');
    }
    return conv;
  }

  private getOtherUserId(conv: Conversation, userId: number): number {
    return conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
  }

  async createSession(
    userId: number,
    conversationId: number,
    mode: 'swipe' | 'vote',
    filters?: Record<string, unknown>,
    restaurantIds?: number[],
  ): Promise<PickSession> {
    const conv = await this.validateParticipant(conversationId, userId);

    // Check no active session exists
    const existing = await this.sessionRepo.findOne({
      where: { conversationId, status: 'active' },
    });
    if (existing) throw new BadRequestException('Уже есть активная сессия');

    let pool: number[] = [];

    if (mode === 'vote') {
      if (!restaurantIds?.length) throw new BadRequestException('Выберите рестораны для голосования');
      if (restaurantIds.length > 10) throw new BadRequestException('Максимум 10 ресторанов');
      pool = restaurantIds;
    } else {
      // Swipe mode — build pool from filters
      const qb = this.restRepo.createQueryBuilder('r')
        .select('r.id')
        .orderBy('RANDOM()')
        .limit(50);

      if (filters?.citySlug) {
        qb.innerJoin('r.city', 'city').andWhere('city.slug = :citySlug', { citySlug: filters.citySlug });
      }
      if (filters?.cuisineIds && Array.isArray(filters.cuisineIds) && filters.cuisineIds.length) {
        qb.innerJoin('r.cuisines', 'cuisine').andWhere('cuisine.id IN (:...cuisineIds)', { cuisineIds: filters.cuisineIds });
      }
      if (filters?.priceLevelMin) {
        qb.andWhere('r.priceLevel >= :pMin', { pMin: filters.priceLevelMin });
      }
      if (filters?.priceLevelMax) {
        qb.andWhere('r.priceLevel <= :pMax', { pMax: filters.priceLevelMax });
      }

      // Ensure restaurants have photos
      qb.andWhere(`EXISTS (SELECT 1 FROM photos p WHERE p.restaurant_id = r.id)`);

      const rows = await qb.getRawMany();
      pool = rows.map(r => r.r_id);

      if (pool.length < 5) throw new BadRequestException('Недостаточно ресторанов по фильтрам. Попробуйте расширить критерии.');
    }

    const session = this.sessionRepo.create({
      conversationId,
      creatorId: userId,
      mode,
      status: 'active',
      filters: filters || null,
      restaurantPool: pool,
    });

    return this.sessionRepo.save(session);
  }

  async getSession(sessionId: number, userId: number) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['conversation'],
    });
    if (!session) throw new NotFoundException('Сессия не найдена');
    const conv = session.conversation;
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      throw new ForbiddenException('Нет доступа');
    }
    return session;
  }

  async getActiveSession(conversationId: number, userId: number) {
    await this.validateParticipant(conversationId, userId);
    return this.sessionRepo.findOne({
      where: { conversationId, status: 'active' },
    });
  }

  async getNextCard(sessionId: number, userId: number) {
    const session = await this.getSession(sessionId, userId);
    if (session.mode !== 'swipe') throw new BadRequestException('Только для режима свайпа');
    if (session.status !== 'active') return null;

    // Get IDs user already voted on
    const voted = await this.voteRepo.find({
      where: { sessionId, userId },
      select: ['restaurantId'],
    });
    const votedIds = new Set(voted.map(v => v.restaurantId));

    // Find next unvoted restaurant from pool
    const nextId = session.restaurantPool.find(id => !votedIds.has(id));
    if (!nextId) return null; // All swiped

    const restaurant = await this.restRepo.findOne({
      where: { id: nextId },
      relations: ['cuisines', 'photos'],
    });

    return restaurant;
  }

  async submitVote(
    sessionId: number,
    userId: number,
    restaurantId: number,
    reaction: 'like' | 'dislike' | 'superlike',
  ) {
    const session = await this.getSession(sessionId, userId);
    if (session.status !== 'active') throw new BadRequestException('Сессия завершена');
    if (!session.restaurantPool.includes(restaurantId)) {
      throw new BadRequestException('Ресторан не в пуле');
    }

    // Upsert vote
    const existing = await this.voteRepo.findOne({
      where: { sessionId, userId, restaurantId },
    });
    if (existing) {
      existing.reaction = reaction;
      await this.voteRepo.save(existing);
    } else {
      await this.voteRepo.save(this.voteRepo.create({ sessionId, userId, restaurantId, reaction }));
    }

    // Check for match (swipe mode)
    let match: Restaurant | null = null;
    if (session.mode === 'swipe' && (reaction === 'like' || reaction === 'superlike')) {
      const conv = session.conversation || await this.convRepo.findOneBy({ id: session.conversationId });
      const otherId = this.getOtherUserId(conv!, userId);

      const otherVote = await this.voteRepo.findOne({
        where: { sessionId, userId: otherId, restaurantId },
      });

      if (otherVote && (otherVote.reaction === 'like' || otherVote.reaction === 'superlike')) {
        match = await this.restRepo.findOne({
          where: { id: restaurantId },
          relations: ['cuisines', 'photos'],
        });
      }
    }

    return { reaction, match };
  }

  async getResults(sessionId: number, userId: number) {
    const session = await this.getSession(sessionId, userId);
    const votes = await this.voteRepo.find({ where: { sessionId } });
    const conv = session.conversation || await this.convRepo.findOneBy({ id: session.conversationId });

    if (session.mode === 'swipe') {
      // Find restaurants where both users liked
      const user1Id = conv!.participant1Id;
      const user2Id = conv!.participant2Id;

      const u1Likes = new Set(votes.filter(v => v.userId === user1Id && v.reaction !== 'dislike').map(v => v.restaurantId));
      const u2Likes = new Set(votes.filter(v => v.userId === user2Id && v.reaction !== 'dislike').map(v => v.restaurantId));

      const matchIds = [...u1Likes].filter(id => u2Likes.has(id));
      const matches = matchIds.length
        ? await this.restRepo.find({ where: { id: In(matchIds) }, relations: ['cuisines', 'photos'] })
        : [];

      return { mode: 'swipe', matches, totalSwiped: session.restaurantPool.length };
    } else {
      // Vote mode — scoring
      const scoreMap = new Map<number, number>();
      for (const v of votes) {
        const pts = v.reaction === 'superlike' ? 2 : v.reaction === 'like' ? 1 : 0;
        scoreMap.set(v.restaurantId, (scoreMap.get(v.restaurantId) || 0) + pts);
      }

      const sorted = [...scoreMap.entries()].sort((a, b) => b[1] - a[1]);
      const ids = sorted.map(([id]) => id);
      const restaurants = ids.length
        ? await this.restRepo.find({ where: { id: In(ids) }, relations: ['cuisines', 'photos'] })
        : [];

      const ranked = sorted.map(([id, score]) => ({
        restaurant: restaurants.find(r => r.id === id),
        score,
      }));

      return { mode: 'vote', ranked };
    }
  }

  async completeSession(sessionId: number, userId: number) {
    const session = await this.getSession(sessionId, userId);
    session.status = 'completed';
    session.completedAt = new Date();
    return this.sessionRepo.save(session);
  }

  async cancelSession(sessionId: number, userId: number) {
    const session = await this.getSession(sessionId, userId);
    session.status = 'cancelled';
    return this.sessionRepo.save(session);
  }

  async getSessionRestaurants(sessionId: number, userId: number) {
    const session = await this.getSession(sessionId, userId);
    if (!session.restaurantPool.length) return [];
    return this.restRepo.find({
      where: { id: In(session.restaurantPool) },
      relations: ['cuisines', 'photos'],
    });
  }
}
