import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, LoyaltyLevel } from '@database/entities/user.entity';

const LEVEL_THRESHOLDS: { level: LoyaltyLevel; minPoints: number }[] = [
  { level: 'gold', minPoints: 5000 },
  { level: 'silver', minPoints: 1000 },
  { level: 'bronze', minPoints: 0 },
];

const POINTS_PER_ACTION: Record<string, number> = {
  review: 50,
  booking: 30,
  first_review: 100,
  referral: 200,
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

  async addPoints(userId: number, action: string, customPoints?: number): Promise<{ points: number; level: LoyaltyLevel }> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const pts = customPoints ?? POINTS_PER_ACTION[action] ?? 10;
    user.loyaltyPoints += pts;

    // Пересчёт уровня
    for (const threshold of LEVEL_THRESHOLDS) {
      if (user.loyaltyPoints >= threshold.minPoints) {
        user.loyaltyLevel = threshold.level;
        break;
      }
    }

    await this.userRepo.save(user);
    return { points: user.loyaltyPoints, level: user.loyaltyLevel };
  }

  async getLeaderboard(limit = 10) {
    return this.userRepo.find({
      select: ['id', 'name', 'avatarUrl', 'loyaltyPoints', 'loyaltyLevel'],
      order: { loyaltyPoints: 'DESC' },
      take: limit,
    });
  }
}
