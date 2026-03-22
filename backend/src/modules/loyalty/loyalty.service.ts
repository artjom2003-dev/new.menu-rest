import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, LoyaltyLevel } from '@database/entities/user.entity';

const LEVEL_THRESHOLDS: { level: LoyaltyLevel; minPoints: number; multiplier: number }[] = [
  { level: 'gold', minPoints: 2000, multiplier: 2 },
  { level: 'silver', minPoints: 500, multiplier: 1.5 },
  { level: 'bronze', minPoints: 0, multiplier: 1 },
];

const POINTS_PER_ACTION: Record<string, number> = {
  review: 15,
  booking: 20,
  first_review: 30,
  referral: 50,
  order: 10,
  photo_upload: 5,
};

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getStatus(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const nextLevel = LEVEL_THRESHOLDS.find(
      (t) => t.minPoints > user.loyaltyPoints,
    );

    return {
      points: user.loyaltyPoints,
      level: user.loyaltyLevel,
      nextLevel: nextLevel?.level ?? null,
      pointsToNextLevel: nextLevel ? nextLevel.minPoints - user.loyaltyPoints : 0,
    };
  }

  private getUserMultiplier(user: User): number {
    const tier = LEVEL_THRESHOLDS.find(t => t.level === user.loyaltyLevel);
    return tier?.multiplier ?? 1;
  }

  private recalculateLevel(user: User): void {
    for (const threshold of LEVEL_THRESHOLDS) {
      if (user.loyaltyPoints >= threshold.minPoints) {
        user.loyaltyLevel = threshold.level;
        break;
      }
    }
  }

  async addPoints(userId: number, action: string, customPoints?: number): Promise<{ points: number; level: LoyaltyLevel }> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Пользователь не найден');

    let pts: number;
    if (customPoints !== undefined) {
      // Custom points are not multiplied
      pts = customPoints;
    } else {
      const base = POINTS_PER_ACTION[action] ?? 10;
      const multiplier = this.getUserMultiplier(user);
      pts = Math.round(base * multiplier);
    }

    user.loyaltyPoints += pts;

    // Пересчёт уровня
    this.recalculateLevel(user);

    await this.userRepo.save(user);
    return { points: user.loyaltyPoints, level: user.loyaltyLevel };
  }

  async redeemPoints(
    userId: number,
    amount: number,
    restaurantId: number,
    orderTotal: number,
  ): Promise<{ success: boolean; pointsSpent: number; newBalance: number; discount: number }> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Пользователь не найден');

    if (amount < 100) {
      throw new BadRequestException('Минимальное количество баллов для списания — 100');
    }

    if (user.loyaltyPoints < amount) {
      throw new BadRequestException('Недостаточно баллов');
    }

    // 1 point = 1 ruble discount, max 30% of order total
    const maxDiscount = Math.floor(orderTotal * 0.3);
    const discount = Math.min(amount, maxDiscount);
    const pointsSpent = discount; // 1:1 ratio

    user.loyaltyPoints -= pointsSpent;

    // Tier can go down
    this.recalculateLevel(user);

    await this.userRepo.save(user);

    return {
      success: true,
      pointsSpent,
      newBalance: user.loyaltyPoints,
      discount,
    };
  }

  async getLeaderboard(limit = 10) {
    return this.userRepo.find({
      select: ['id', 'name', 'avatarUrl', 'loyaltyPoints', 'loyaltyLevel'],
      order: { loyaltyPoints: 'DESC' },
      take: limit,
    });
  }

  async getWeeklyLeaderboard(limit = 10) {
    // Since we don't have a points history table, return mock weekly data
    // based on real users but with simulated weekly points
    const users = await this.userRepo.find({
      select: ['id', 'name', 'avatarUrl', 'loyaltyPoints', 'loyaltyLevel'],
      order: { loyaltyPoints: 'DESC' },
      take: limit * 2,
    });

    // Simulate weekly points as a fraction of total, with some randomness
    // Seed the "random" based on current week so it's consistent within a week
    const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const weeklyUsers = users.map((u, i) => ({
      ...u,
      weeklyPoints: Math.max(10, Math.floor(u.loyaltyPoints * (0.05 + (((weekNumber * 31 + i * 7) % 17) / 100)))),
    }));

    weeklyUsers.sort((a, b) => b.weeklyPoints - a.weeklyPoints);

    return weeklyUsers.slice(0, limit);
  }

  async getCommunityStats() {
    const result = await this.userRepo
      .createQueryBuilder('u')
      .select('SUM(u.loyaltyPoints)', 'totalPoints')
      .addSelect('COUNT(u.id)', 'totalMembers')
      .getRawOne();

    return {
      totalPoints: parseInt(result?.totalPoints || '0', 10),
      totalMembers: parseInt(result?.totalMembers || '0', 10),
    };
  }
}
