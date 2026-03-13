import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '@database/entities/restaurant.entity';
import { User } from '@database/entities/user.entity';
import { Review } from '@database/entities/review.entity';
import { Booking } from '@database/entities/booking.entity';
import { Article } from '@database/entities/article.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Restaurant) private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Article) private readonly articleRepo: Repository<Article>,
  ) {}

  async getDashboard() {
    const [restaurantCount, userCount, reviewCount, bookingCount, pendingReviews] =
      await Promise.all([
        this.restaurantRepo.count(),
        this.userRepo.count(),
        this.reviewRepo.count(),
        this.bookingRepo.count(),
        this.reviewRepo.count({ where: { status: 'pending' } }),
      ]);

    return {
      restaurants: restaurantCount,
      users: userCount,
      reviews: reviewCount,
      bookings: bookingCount,
      pendingReviews,
    };
  }

  async getUsers(page = 1, limit = 20) {
    const [items, total] = await this.userRepo.findAndCount({
      select: ['id', 'name', 'email', 'loyaltyLevel', 'loyaltyPoints', 'createdAt'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getRestaurants(page = 1, limit = 20, status?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [items, total] = await this.restaurantRepo.findAndCount({
      where,
      relations: ['city', 'cuisines'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }
}
