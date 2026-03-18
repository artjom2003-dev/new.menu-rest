import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import slugify from 'slugify';
import { User } from '@database/entities/user.entity';
import { Restaurant } from '@database/entities/restaurant.entity';
import { Article } from '@database/entities/article.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Restaurant) private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(Article) private readonly articleRepo: Repository<Article>,
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

  // ─── Owner: My Restaurant ───────────────────────────

  async getMyRestaurant(userId: number): Promise<Restaurant> {
    const restaurant = await this.restaurantRepo.findOne({
      where: { ownerId: userId },
      relations: ['cuisines', 'city', 'photos', 'workingHours', 'features'],
    });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');
    return restaurant;
  }

  async updateMyRestaurant(userId: number, dto: Record<string, unknown>): Promise<Restaurant> {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    const allowed = ['description', 'phone', 'website', 'hasWifi', 'hasDelivery', 'averageBill'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (dto[key] !== undefined) update[key] = dto[key];
    }

    await this.restaurantRepo.update(restaurant.id, update);
    return this.getMyRestaurant(userId);
  }

  async getMyRestaurantPosts(userId: number): Promise<Article[]> {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    return this.articleRepo.find({
      where: { restaurants: { id: restaurant.id } },
      order: { createdAt: 'DESC' },
    });
  }

  async createMyRestaurantPost(
    userId: number,
    dto: { title: string; body: string; category: string },
  ): Promise<Article> {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    const slug = slugify(dto.title, { lower: true, strict: true, locale: 'ru' }) + '-' + Date.now();

    const article = this.articleRepo.create({
      title: dto.title,
      slug,
      body: dto.body,
      category: dto.category,
      authorName: restaurant.name,
      status: 'published',
      publishedAt: new Date(),
      cityId: restaurant.cityId,
    });

    const saved = await this.articleRepo.save(article);

    // Link article to restaurant
    await this.articleRepo
      .createQueryBuilder()
      .relation(Article, 'restaurants')
      .of(saved.id)
      .add(restaurant.id);

    return saved;
  }
}
