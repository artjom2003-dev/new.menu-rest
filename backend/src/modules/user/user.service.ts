import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import slugify from 'slugify';
import { User } from '@database/entities/user.entity';
import { Restaurant } from '@database/entities/restaurant.entity';
import { Article } from '@database/entities/article.entity';
import { Listing, ListingType } from '@database/entities/listing.entity';
import { WorkingHours } from '@database/entities/working-hours.entity';
import { Feature } from '@database/entities/feature.entity';
import { Dish } from '@database/entities/dish.entity';
import { RestaurantDish } from '@database/entities/restaurant-dish.entity';
import { StorageService } from '@common/services/storage.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Restaurant) private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(Article) private readonly articleRepo: Repository<Article>,
    @InjectRepository(Listing) private readonly listingRepo: Repository<Listing>,
    @InjectRepository(WorkingHours) private readonly workingHoursRepo: Repository<WorkingHours>,
    @InjectRepository(Feature) private readonly featureRepo: Repository<Feature>,
    @InjectRepository(Dish) private readonly dishRepo: Repository<Dish>,
    @InjectRepository(RestaurantDish) private readonly restaurantDishRepo: Repository<RestaurantDish>,
    private readonly storage: StorageService,
  ) {}

  async getPublicProfile(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'name', 'avatarUrl', 'loyaltyLevel', 'loyaltyPoints', 'createdAt', 'bio', 'age', 'cityName', 'favoriteCuisines', 'favoriteDishes'],
    });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const [{ count }] = await this.userRepo.manager.query(
      `SELECT COUNT(*)::int AS count FROM bookings WHERE user_id = $1 AND status = 'completed'`,
      [userId],
    );

    return { ...user, visitsCount: count };
  }

  async getMe(userId: number): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['city', 'favoriteRestaurants', 'allergenProfile'],
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async updateMe(userId: number, dto: Partial<User>): Promise<User> {
    await this.userRepo.update(userId, dto);
    return this.getMe(userId);
  }

  async updateAllergens(userId: number, allergenIds: number[]) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['allergenProfile'] });
    if (!user) throw new NotFoundException('Пользователь не найден');

    // Clear and set
    await this.userRepo.manager.query('DELETE FROM user_allergens WHERE user_id = $1', [userId]);
    if (allergenIds.length > 0) {
      const values = allergenIds.map((_, i) => `($1, $${i + 2})`).join(',');
      await this.userRepo.manager.query(
        `INSERT INTO user_allergens (user_id, allergen_id) VALUES ${values} ON CONFLICT DO NOTHING`,
        [userId, ...allergenIds],
      );
    }

    return this.getMe(userId);
  }

  async uploadAvatar(userId: number, file: Express.Multer.File): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    // Delete old avatar if exists
    if (user.avatarUrl) {
      try { await this.storage.delete(user.avatarUrl); } catch {}
    }

    const { original } = await this.storage.upload(file, 'avatars');
    await this.userRepo.update(userId, { avatarUrl: original });
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

  async getWishlist(userId: number): Promise<Restaurant[]> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['wishlistRestaurants', 'wishlistRestaurants.cuisines'],
    });
    if (!user) throw new NotFoundException();
    return user.wishlistRestaurants;
  }

  async toggleWishlist(userId: number, restaurantId: number): Promise<{ added: boolean }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['wishlistRestaurants'],
    });
    if (!user) throw new NotFoundException();

    const idx = user.wishlistRestaurants.findIndex((r) => r.id === restaurantId);
    if (idx >= 0) {
      user.wishlistRestaurants.splice(idx, 1);
      await this.userRepo.save(user);
      return { added: false };
    } else {
      user.wishlistRestaurants.push({ id: restaurantId } as never);
      await this.userRepo.save(user);
      return { added: true };
    }
  }

  async getWishlistUsers(restaurantId: number): Promise<Array<{ id: number; name: string | null; avatarUrl: string | null; loyaltyLevel: string; blockMessages: boolean }>> {
    const users = await this.userRepo
      .createQueryBuilder('user')
      .innerJoin('user.wishlistRestaurants', 'r', 'r.id = :restaurantId', { restaurantId })
      .select(['user.id', 'user.name', 'user.avatarUrl', 'user.loyaltyLevel', 'user.blockMessages'])
      .where('user.hide_from_wishlists = false')
      .getMany();
    return users.map(u => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl, loyaltyLevel: u.loyaltyLevel, blockMessages: u.blockMessages }));
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

    const allowed = ['description', 'phone', 'website', 'hasWifi', 'hasDelivery', 'averageBill', 'address', 'metroStation', 'venueType', 'priceLevel', 'instagram', 'vk', 'email'];
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

  // ─── Owner: Listings (jobs + suppliers) ───────────────

  async getMyListings(userId: number): Promise<Listing[]> {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    return this.listingRepo.find({
      where: { restaurantId: restaurant.id },
      order: { createdAt: 'DESC' },
    });
  }

  async createListing(
    userId: number,
    dto: { type: ListingType; title: string; description?: string; category?: string; salary?: string; contactInfo?: string },
  ): Promise<Listing> {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    const listing = this.listingRepo.create({
      restaurantId: restaurant.id,
      type: dto.type,
      title: dto.title,
      description: dto.description ?? null,
      category: dto.category ?? null,
      salary: dto.salary ?? null,
      contactInfo: dto.contactInfo ?? null,
    });

    return this.listingRepo.save(listing);
  }

  async deleteListing(userId: number, listingId: number): Promise<void> {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    const listing = await this.listingRepo.findOneBy({ id: listingId, restaurantId: restaurant.id });
    if (!listing) throw new NotFoundException('Объявление не найдено');

    await this.listingRepo.remove(listing);
  }

  // ─── Owner: Working Hours ──────────────────────────────

  async updateMyWorkingHours(
    userId: number,
    hours: Array<{ dayOfWeek: number; openTime: string | null; closeTime: string | null; isClosed: boolean }>,
  ): Promise<WorkingHours[]> {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    // Upsert each day
    for (const h of hours) {
      const existing = await this.workingHoursRepo.findOneBy({ restaurantId: restaurant.id, dayOfWeek: h.dayOfWeek });
      if (existing) {
        existing.openTime = h.isClosed ? null : h.openTime;
        existing.closeTime = h.isClosed ? null : h.closeTime;
        existing.isClosed = h.isClosed;
        await this.workingHoursRepo.save(existing);
      } else {
        await this.workingHoursRepo.save(this.workingHoursRepo.create({
          restaurantId: restaurant.id,
          dayOfWeek: h.dayOfWeek,
          openTime: h.isClosed ? null : h.openTime,
          closeTime: h.isClosed ? null : h.closeTime,
          isClosed: h.isClosed,
        }));
      }
    }

    return this.workingHoursRepo.find({ where: { restaurantId: restaurant.id }, order: { dayOfWeek: 'ASC' } });
  }

  // ─── Owner: Features ─────────────────────────────────────

  async updateMyFeatures(userId: number, featureIds: number[]): Promise<Feature[]> {
    const restaurant = await this.restaurantRepo.findOne({
      where: { ownerId: userId },
      relations: ['features'],
    });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    if (featureIds.length === 0) {
      restaurant.features = [];
    } else {
      restaurant.features = await this.featureRepo.findBy({ id: In(featureIds) });
    }
    await this.restaurantRepo.save(restaurant);
    return restaurant.features;
  }

  // ─── Owner: Menu ──────────────────────────────────────────

  async getMyMenu(userId: number) {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    const items = await this.restaurantDishRepo.find({
      where: { restaurantId: restaurant.id },
      relations: ['dish', 'dish.allergens'],
      order: { categoryName: 'ASC', sortOrder: 'ASC' },
    });

    return items;
  }

  async createMyDish(
    userId: number,
    dto: { name: string; description?: string; composition?: string; categoryName?: string; price?: number; weightGrams?: number; volumeMl?: number; calories?: number; protein?: number; fat?: number; carbs?: number },
  ): Promise<RestaurantDish> {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    const dish = this.dishRepo.create({
      name: dto.name,
      description: dto.description || null,
      composition: dto.composition || null,
      weightGrams: dto.weightGrams || null,
      volumeMl: dto.volumeMl || null,
      calories: dto.calories || null,
      protein: dto.protein || null,
      fat: dto.fat || null,
      carbs: dto.carbs || null,
    });
    const savedDish = await this.dishRepo.save(dish);

    const entry = this.restaurantDishRepo.create({
      restaurantId: restaurant.id,
      dishId: savedDish.id,
      categoryName: dto.categoryName || 'Основное меню',
      price: dto.price || 0,
      isAvailable: true,
    });
    const savedEntry = await this.restaurantDishRepo.save(entry);
    savedEntry.dish = savedDish;
    return savedEntry;
  }

  async updateMyDish(
    userId: number,
    entryId: number,
    dto: { name?: string; description?: string; composition?: string; categoryName?: string; price?: number; weightGrams?: number; volumeMl?: number; calories?: number; protein?: number; fat?: number; carbs?: number; isAvailable?: boolean },
  ): Promise<RestaurantDish> {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    const entry = await this.restaurantDishRepo.findOne({ where: { id: entryId, restaurantId: restaurant.id }, relations: ['dish'] });
    if (!entry) throw new NotFoundException('Позиция меню не найдена');

    // Update dish fields
    const dishUpdate: Record<string, unknown> = {};
    for (const key of ['name', 'description', 'composition', 'weightGrams', 'volumeMl', 'calories', 'protein', 'fat', 'carbs'] as const) {
      if (dto[key] !== undefined) dishUpdate[key] = dto[key];
    }
    if (Object.keys(dishUpdate).length > 0) {
      await this.dishRepo.update(entry.dishId, dishUpdate);
    }

    // Update entry fields
    if (dto.categoryName !== undefined) entry.categoryName = dto.categoryName;
    if (dto.price !== undefined) entry.price = dto.price;
    if (dto.isAvailable !== undefined) entry.isAvailable = dto.isAvailable;
    await this.restaurantDishRepo.save(entry);

    return this.restaurantDishRepo.findOne({ where: { id: entryId }, relations: ['dish'] }) as Promise<RestaurantDish>;
  }

  async uploadDishPhoto(userId: number, entryId: number, file: Express.Multer.File) {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    const entry = await this.restaurantDishRepo.findOne({ where: { id: entryId, restaurantId: restaurant.id }, relations: ['dish'] });
    if (!entry) throw new NotFoundException('Позиция меню не найдена');

    if (!file) throw new BadRequestException('Файл не передан');
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('Допустимые форматы: JPEG, PNG, WebP');

    const { original } = await this.storage.upload(file, `dishes/${entry.dishId}`);
    await this.dishRepo.update(entry.dishId, { imageUrl: original });

    return this.restaurantDishRepo.findOne({ where: { id: entryId }, relations: ['dish'] });
  }

  async deleteMyDish(userId: number, entryId: number): Promise<void> {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    const entry = await this.restaurantDishRepo.findOneBy({ id: entryId, restaurantId: restaurant.id });
    if (!entry) throw new NotFoundException('Позиция меню не найдена');

    await this.restaurantDishRepo.remove(entry);
  }

  async uploadMyMenuPdf(userId: number, file: Express.Multer.File): Promise<{ url: string }> {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    const { original } = await this.storage.upload(file, 'menu-pdfs');
    return { url: original };
  }

  async getPublicListings(type?: ListingType): Promise<Listing[]> {
    const where: Record<string, unknown> = { status: 'active' };
    if (type) where.type = type;

    return this.listingRepo.find({
      where,
      relations: ['restaurant'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
