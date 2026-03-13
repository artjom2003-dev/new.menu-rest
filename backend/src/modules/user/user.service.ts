import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@database/entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async getMe(userId: number): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['city', 'favoriteRestaurants'],
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async updateMe(userId: number, dto: Partial<User>): Promise<User> {
    await this.userRepo.update(userId, dto);
    return this.getMe(userId);
  }

  async toggleFavorite(userId: number, restaurantId: number): Promise<{ added: boolean }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['favoriteRestaurants'],
    });
    if (!user) throw new NotFoundException();

    const idx = user.favoriteRestaurants.findIndex((r) => r.id === restaurantId);
    if (idx >= 0) {
      user.favoriteRestaurants.splice(idx, 1);
      await this.userRepo.save(user);
      return { added: false };
    } else {
      user.favoriteRestaurants.push({ id: restaurantId } as never);
      await this.userRepo.save(user);
      return { added: true };
    }
  }
}
