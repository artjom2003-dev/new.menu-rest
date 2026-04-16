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

  async deleteAccount(userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    // Clean up related data that doesn't cascade automatically
    await this.userRepo.manager.query('DELETE FROM user_allergens WHERE user_id = $1', [userId]);
    await this.userRepo.manager.query('DELETE FROM user_favorites WHERE "userId" = $1', [userId]);
    await this.userRepo.manager.query('DELETE FROM user_wishlists WHERE "userId" = $1', [userId]);
    await this.userRepo.manager.query('DELETE FROM messages WHERE sender_id = $1', [userId]);
    await this.userRepo.manager.query(
      'DELETE FROM conversations WHERE participant1_id = $1 OR participant2_id = $1', [userId],
    );

    // Delete avatar from storage
    if (user.avatarUrl) {
      try { await this.storage.delete(user.avatarUrl); } catch {}
    }

    await this.userRepo.delete(userId);
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

  async deleteMyRestaurantPost(userId: number, postId: number): Promise<void> {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    const article = await this.articleRepo.findOneBy({ id: postId });
    if (!article) throw new NotFoundException('Публикация не найдена');

    await this.articleRepo.remove(article);
  }

  // ─── Owner: E-Menu Settings ────────────────────────

  async getEMenuSettings(userId: number) {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');
    const rows = await this.restaurantRepo.manager.query(
      'SELECT emenu_settings FROM restaurants WHERE id = $1', [restaurant.id],
    );
    return rows[0]?.emenu_settings || {};
  }

  async updateEMenuSettings(userId: number, settings: Record<string, unknown>) {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');
    await this.restaurantRepo.manager.query(
      'UPDATE restaurants SET emenu_settings = $1 WHERE id = $2',
      [JSON.stringify(settings), restaurant.id],
    );
    return settings;
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

    // Raw query to bypass TypeORM entity cache
    const rows = await this.restaurantDishRepo.manager.query(`
      SELECT rd.id, rd.dish_id AS "dishId", rd.restaurant_id AS "restaurantId",
             rd.price, rd.category_name AS "categoryName", rd.is_available AS "isAvailable",
             rd.sort_order AS "sortOrder", rd.station, rd.prep_time_min AS "prepTimeMin",
             rd.menu_category_id AS "menuCategoryId",
             d.id AS "dish_id", d.name AS "dish_name", d.description AS "dish_description",
             d.composition AS "dish_composition", d.weight_grams AS "dish_weightGrams",
             d.volume_ml AS "dish_volumeMl", d.calories AS "dish_calories",
             d.protein AS "dish_protein", d.fat AS "dish_fat", d.carbs AS "dish_carbs",
             d.image_url AS "dish_imageUrl"
      FROM restaurant_dishes rd
      JOIN dishes d ON d.id = rd.dish_id
      WHERE rd.restaurant_id = $1
      ORDER BY rd.category_name ASC, rd.sort_order ASC
    `, [restaurant.id]);

    return rows.map((r: any) => ({
      id: r.id,
      dishId: r.dishId,
      restaurantId: r.restaurantId,
      price: r.price,
      categoryName: r.categoryName,
      isAvailable: r.isAvailable,
      sortOrder: r.sortOrder,
      station: r.station,
      prepTimeMin: r.prepTimeMin,
      menuCategoryId: r.menuCategoryId,
      dish: {
        id: r.dish_id,
        name: r.dish_name,
        description: r.dish_description,
        composition: r.dish_composition,
        weightGrams: r.dish_weightGrams,
        volumeMl: r.dish_volumeMl,
        calories: r.dish_calories,
        protein: r.dish_protein,
        fat: r.dish_fat,
        carbs: r.dish_carbs,
        imageUrl: r.dish_imageUrl,
      },
    }));
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
  ) {
    const restaurant = await this.restaurantRepo.findOneBy({ ownerId: userId });
    if (!restaurant) throw new NotFoundException('У вас нет привязанного ресторана');

    // Get entry via raw query to avoid cache
    const entries = await this.restaurantDishRepo.manager.query(
      'SELECT id, dish_id FROM restaurant_dishes WHERE id = $1 AND restaurant_id = $2',
      [entryId, restaurant.id],
    );
    if (!entries.length) throw new NotFoundException('Позиция меню не найдена');
    const dishId = entries[0].dish_id;

    // Update dish table via raw SQL
    const dishFields: string[] = [];
    const dishValues: unknown[] = [];
    let idx = 1;
    const fieldMap: Record<string, string> = {
      name: 'name', description: 'description', composition: 'composition',
      weightGrams: 'weight_grams', volumeMl: 'volume_ml',
      calories: 'calories', protein: 'protein', fat: 'fat', carbs: 'carbs',
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      if ((dto as any)[key] !== undefined) {
        dishFields.push(`${col} = $${idx++}`);
        dishValues.push((dto as any)[key]);
      }
    }
    if (dishFields.length > 0) {
      dishValues.push(dishId);
      await this.restaurantDishRepo.manager.query(
        `UPDATE dishes SET ${dishFields.join(', ')} WHERE id = $${idx}`,
        dishValues,
      );
    }

    // Update restaurant_dishes table via raw SQL
    const entryFields: string[] = [];
    const entryValues: unknown[] = [];
    let idx2 = 1;
    if (dto.categoryName !== undefined) { entryFields.push(`category_name = $${idx2++}`); entryValues.push(dto.categoryName); }
    if (dto.price !== undefined) { entryFields.push(`price = $${idx2++}`); entryValues.push(dto.price); }
    if (dto.isAvailable !== undefined) { entryFields.push(`is_available = $${idx2++}`); entryValues.push(dto.isAvailable); }
    if (entryFields.length > 0) {
      entryValues.push(entryId);
      await this.restaurantDishRepo.manager.query(
        `UPDATE restaurant_dishes SET ${entryFields.join(', ')} WHERE id = $${idx2}`,
        entryValues,
      );
    }

    // Return fresh data via raw query
    const rows = await this.restaurantDishRepo.manager.query(`
      SELECT rd.id, rd.dish_id AS "dishId", rd.restaurant_id AS "restaurantId",
             rd.price, rd.category_name AS "categoryName", rd.is_available AS "isAvailable",
             rd.sort_order AS "sortOrder", rd.station, rd.prep_time_min AS "prepTimeMin",
             d.id AS "d_id", d.name AS "d_name", d.description AS "d_description",
             d.composition AS "d_composition", d.weight_grams AS "d_weightGrams",
             d.image_url AS "d_imageUrl"
      FROM restaurant_dishes rd JOIN dishes d ON d.id = rd.dish_id
      WHERE rd.id = $1
    `, [entryId]);
    const r = rows[0];
    return {
      id: r.id, dishId: r.dishId, restaurantId: r.restaurantId,
      price: r.price, categoryName: r.categoryName, isAvailable: r.isAvailable,
      sortOrder: r.sortOrder, station: r.station, prepTimeMin: r.prepTimeMin,
      dish: { id: r.d_id, name: r.d_name, description: r.d_description, composition: r.d_composition, weightGrams: r.d_weightGrams, imageUrl: r.d_imageUrl },
    };
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
