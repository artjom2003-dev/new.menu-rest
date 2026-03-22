import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewStatus } from '@database/entities/review.entity';
import { RestaurantService } from '@modules/restaurant/restaurant.service';
import { LoyaltyService } from '@modules/loyalty/loyalty.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    private readonly restaurantService: RestaurantService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  async findByRestaurant(restaurantId: number, page = 1, limit = 20) {
    const [items, total] = await this.reviewRepo.findAndCount({
      where: { restaurantId, status: 'approved' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async create(userId: number, dto: CreateReviewDto): Promise<Review> {
    // Проверяем что ресторан существует
    await this.restaurantService.findById(dto.restaurantId);

    const ratingOverall = +(
      (dto.ratingFood + dto.ratingService + dto.ratingAtmosphere + dto.ratingValue) / 4
    ).toFixed(2);

    const review = this.reviewRepo.create({
      userId,
      restaurantId: dto.restaurantId,
      ratingFood: dto.ratingFood,
      ratingService: dto.ratingService,
      ratingAtmosphere: dto.ratingAtmosphere,
      ratingValue: dto.ratingValue,
      ratingOverall,
      text: dto.text ?? null,
      status: 'pending',
    });

    const saved = await this.reviewRepo.save(review);

    // Auto-award loyalty points for review
    const existingCount = await this.reviewRepo.count({
      where: { userId, restaurantId: dto.restaurantId },
    });
    // existingCount includes the just-saved review, so 1 means it's the first
    const action = existingCount === 1 ? 'first_review' : 'review';
    await this.loyaltyService.addPoints(userId, action);

    return saved;
  }

  async moderate(reviewId: number, status: 'approved' | 'rejected'): Promise<Review> {
    const review = await this.reviewRepo.findOneBy({ id: reviewId });
    if (!review) throw new NotFoundException(`Отзыв #${reviewId} не найден`);

    review.status = status;
    const saved = await this.reviewRepo.save(review);

    // Пересчитываем рейтинг ресторана
    if (status === 'approved') {
      await this.restaurantService.updateRating(review.restaurantId);
    }

    return saved;
  }

  async delete(reviewId: number, userId: number): Promise<void> {
    const review = await this.reviewRepo.findOneBy({ id: reviewId });
    if (!review) throw new NotFoundException(`Отзыв #${reviewId} не найден`);
    if (review.userId !== userId) throw new ForbiddenException('Нельзя удалить чужой отзыв');

    await this.reviewRepo.remove(review);
    await this.restaurantService.updateRating(review.restaurantId);
  }

  async findPending(page = 1, limit = 20) {
    const [items, total] = await this.reviewRepo.findAndCount({
      where: { status: 'pending' as ReviewStatus },
      relations: ['restaurant'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }
}
