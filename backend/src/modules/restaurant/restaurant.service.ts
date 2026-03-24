import {
  Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import slugify from 'slugify';
import { Restaurant } from '@database/entities/restaurant.entity';
import { Cuisine } from '@database/entities/cuisine.entity';
import { Photo } from '@database/entities/photo.entity';
import { StorageService } from '@common/services/storage.service';
import { SearchService } from '@modules/search/search.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { QueryRestaurantDto } from './dto/query-restaurant.dto';

@Injectable()
export class RestaurantService implements OnModuleInit {
  private readonly logger = new Logger(RestaurantService.name);
  private countCache = new Map<string, { total: number; expires: number }>();
  private listCache = new Map<string, { data: unknown; expires: number }>();

  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(Cuisine)
    private readonly cuisineRepo: Repository<Cuisine>,
    @InjectRepository(Photo)
    private readonly photoRepo: Repository<Photo>,
    private readonly storage: StorageService,
    private readonly searchService: SearchService,
  ) {}

  onModuleInit() {
    this.logger.log('RestaurantService ready (cache warms on first request)');
  }

  async findAll(query: QueryRestaurantDto) {
    const { page = 1, limit = 20, city, cuisine, priceLevel, priceLevelMin, priceLevelMax, sortBy = 'rating', status = 'published', search, features, hasMenu, metro, district, venueType, lat, lng, radius = 10 } = query;

    // Response cache (30s) — huge perf win on 144K rows
    const listCacheKey = JSON.stringify(query);
    const cachedList = this.listCache.get(listCacheKey);
    if (cachedList && cachedList.expires > Date.now()) {
      return cachedList.data;
    }

    const qb = this.restaurantRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.cuisines', 'c')
      .leftJoinAndSelect('r.city', 'city')
      .leftJoinAndSelect('r.features', 'features')
      .where('r.status = :status', { status });

    // Photos filter removed — show all published restaurants including those without photos

    if (search) {
      // Normalize: replace dashes/punctuation with spaces, split into words
      const words = search.replace(/[-&.,;:!?]+/g, ' ').split(/\s+/).filter(w => w.length >= 2);
      if (words.length > 1) {
        // Multi-word: all words must appear in name (fast, uses index)
        words.forEach((word, i) => {
          const param = `sw${i}`;
          qb.andWhere(`r.name ILIKE :${param}`, { [param]: `%${word}%` });
        });
      } else {
        qb.andWhere('(r.name ILIKE :search OR c.name ILIKE :search)', { search: `%${search}%` });
      }
    }

    if (city) {
      qb.andWhere('city.slug = :city', { city });
    }

    if (cuisine) {
      qb.andWhere('c.slug = :cuisine', { cuisine });
    }

    if (priceLevel) {
      qb.andWhere('r.priceLevel = :priceLevel', { priceLevel });
    }

    if (priceLevelMin) {
      qb.andWhere('r.priceLevel >= :priceLevelMin', { priceLevelMin });
    }
    if (priceLevelMax) {
      qb.andWhere('r.priceLevel <= :priceLevelMax', { priceLevelMax });
    }

    if (hasMenu === 'true') {
      qb.andWhere(`EXISTS (SELECT 1 FROM restaurant_dishes rd WHERE rd.restaurant_id = r.id)`);
    }

    if (metro) {
      qb.andWhere('r.metro_station = :metro', { metro });
    }

    if (district) {
      // Match all slug variants: "arbat", "arbat-rayon", "rayon-arbat", "akademicheskiy", "akademicheskiy-rayon"
      qb.andWhere(`EXISTS (SELECT 1 FROM restaurant_locations rl JOIN districts d ON d.id = rl.district_id WHERE rl.restaurant_id = r.id AND (d.slug = :district OR d.slug = :districtRayon OR d.slug = :rayonDistrict))`, { district, districtRayon: `${district}-rayon`, rayonDistrict: `rayon-${district}` });
    }

    if (venueType) {
      qb.andWhere('r.venue_type = :venueType', { venueType });
    }

    if (features) {
      const featureSlugs = features.split(',').map(s => s.trim()).filter(Boolean);
      if (featureSlugs.length) {
        qb.andWhere('features.slug IN (:...featureSlugs)', { featureSlugs });
      }
    }

    // Geo-distance filter & sort
    if (lat && lng) {
      qb.andWhere('r.lat IS NOT NULL AND r.lng IS NOT NULL');
      qb.andWhere(
        `(6371 * acos(LEAST(1.0, cos(radians(:lat)) * cos(radians(r.lat)) * cos(radians(r.lng) - radians(:lng)) + sin(radians(:lat)) * sin(radians(r.lat))))) <= :radius`,
        { lat, lng, radius },
      );
    }

    if (lat && lng) {
      const distanceExpr = `(6371 * acos(LEAST(1.0, cos(radians(:lat)) * cos(radians(r.lat)) * cos(radians(r.lng) - radians(:lng)) + sin(radians(:lat)) * sin(radians(r.lat)))))`;
      qb.addSelect(`${distanceExpr}`, 'distance_km');
      qb.orderBy(distanceExpr, 'ASC');

      const { entities, raw } = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getRawAndEntities();

      const total = await qb.getCount();

      const distanceMap = new Map<number, number>();
      for (const r of raw) {
        distanceMap.set(r.r_id, Math.round(parseFloat(r.distance_km) * 10) / 10);
      }

      const items = entities.map(e => ({
        ...e,
        distanceKm: distanceMap.get(e.id) ?? undefined,
      }));

      return {
        items,
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }

    // When hasMenu filter is active, show restaurants with photos first
    if (hasMenu === 'true') {
      qb.addSelect(`(EXISTS (SELECT 1 FROM photos p WHERE p.restaurant_id = r.id AND p.is_cover = true))`, 'has_photo');
      qb.orderBy('has_photo', 'DESC');
      if (sortBy === 'rating') {
        qb.addOrderBy('r.rating', 'DESC');
      } else if (sortBy === 'created_at') {
        qb.addOrderBy('r.createdAt', 'DESC');
      } else {
        qb.addOrderBy('r.name', 'ASC');
      }
    } else if (sortBy === 'rating') {
      qb.orderBy('r.rating', 'DESC');
    } else if (sortBy === 'created_at') {
      qb.orderBy('r.createdAt', 'DESC');
    } else {
      qb.orderBy('r.name', 'ASC');
    }

    // Count with 60s in-memory cache to avoid slow COUNT on 144K rows
    const cacheKey = `${status}:${city||''}:${cuisine||''}:${priceLevelMin||''}:${priceLevelMax||''}:${venueType||''}:${metro||''}:${search||''}:${hasMenu||''}:${features||''}:${district||''}`;
    const cached = this.countCache.get(cacheKey);
    let totalPromise: Promise<number>;

    if (cached && cached.expires > Date.now()) {
      totalPromise = Promise.resolve(cached.total);
    } else {
      const countQb = this.restaurantRepo.createQueryBuilder('r')
        .where('r.status = :status', { status });
      if (city) countQb.leftJoin('r.city', 'city').andWhere('city.slug = :city', { city });
      if (cuisine) countQb.leftJoin('r.cuisines', 'c').andWhere('c.slug = :cuisine', { cuisine });
      if (priceLevelMin) countQb.andWhere('r.priceLevel >= :priceLevelMin', { priceLevelMin });
      if (priceLevelMax) countQb.andWhere('r.priceLevel <= :priceLevelMax', { priceLevelMax });
      if (venueType) countQb.andWhere('r.venue_type = :venueType', { venueType });
      if (metro) countQb.andWhere('r.metro_station = :metro', { metro });
      if (search) {
        const cWords = search.replace(/[-&.,;:!?]+/g, ' ').split(/\s+/).filter(w => w.length >= 2);
        if (cWords.length > 1) {
          cWords.forEach((word, i) => {
            countQb.andWhere(`r.name ILIKE :csw${i}`, { [`csw${i}`]: `%${word}%` });
          });
        } else {
          countQb.leftJoin('r.cuisines', 'cs');
          countQb.andWhere('(r.name ILIKE :search OR cs.name ILIKE :search)', { search: `%${search}%` });
        }
      }
      if (hasMenu === 'true') countQb.andWhere('EXISTS (SELECT 1 FROM restaurant_dishes rd WHERE rd.restaurant_id = r.id)');

      // Note: exact grouped count would require chain key logic in SQL which is complex.
      // Using regular count — pagination might be approximate when grouping, but UX is fine.
      const countFn = countQb.getCount();

      totalPromise = countFn.then(total => {
        this.countCache.set(cacheKey, { total, expires: Date.now() + 60_000 });
        return total;
      });
    }

    const [rawItems, total] = await Promise.all([
      qb.skip((page - 1) * limit).take(limit).getMany(),
      totalPromise,
    ]);

    // Load cover photos separately (fast indexed query)
    if (rawItems.length > 0) {
      const ids = rawItems.map(r => r.id);
      const photos = await this.photoRepo
        .createQueryBuilder('p')
        .where('p.restaurant_id IN (:...ids)', { ids })
        .andWhere('p.is_cover = true')
        .getMany();
      const photoMap = new Map(photos.map(p => [p.restaurantId, p]));
      for (const r of rawItems) {
        (r as any).photos = photoMap.has(r.id) ? [photoMap.get(r.id)] : [];
      }
    }

    const result = {
      items: rawItems,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };

    // Cache for 5 minutes
    this.listCache.set(listCacheKey, { data: result, expires: Date.now() + 300_000 });

    return result;
  }

  async findBySlug(slug: string): Promise<Restaurant> {
    const restaurant = await this.restaurantRepo.findOne({
      where: { slug },
      relations: ['cuisines', 'city', 'photos', 'workingHours', 'chain', 'features', 'locations', 'locations.district'],
    });

    if (!restaurant) {
      throw new NotFoundException(`Ресторан "${slug}" не найден`);
    }

    return restaurant;
  }

  async findById(id: number): Promise<Restaurant> {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id },
      relations: ['cuisines', 'city', 'photos', 'chain'],
    });

    if (!restaurant) {
      throw new NotFoundException(`Ресторан #${id} не найден`);
    }

    return restaurant;
  }

  async create(dto: CreateRestaurantDto): Promise<Restaurant> {
    const slug = await this.generateUniqueSlug(dto.name);

    const restaurant = this.restaurantRepo.create({ ...dto, slug });

    if (dto.cuisineIds?.length) {
      restaurant.cuisines = await this.cuisineRepo.findBy({ id: In(dto.cuisineIds) });
    }

    const saved = await this.restaurantRepo.save(restaurant);
    this.searchService.indexRestaurant(saved.id).catch(() => {});
    return saved;
  }

  async update(id: number, dto: UpdateRestaurantDto): Promise<Restaurant> {
    const restaurant = await this.findById(id);

    if (dto.cuisineIds !== undefined) {
      restaurant.cuisines = dto.cuisineIds.length
        ? await this.cuisineRepo.findBy({ id: In(dto.cuisineIds) })
        : [];
    }

    Object.assign(restaurant, dto);
    const saved = await this.restaurantRepo.save(restaurant);
    this.searchService.indexRestaurant(saved.id).catch(() => {});
    return saved;
  }

  async remove(id: number): Promise<void> {
    const restaurant = await this.findById(id);
    await this.restaurantRepo.remove(restaurant);
    this.searchService.removeFromIndex(id).catch(() => {});
  }

  async updateRating(id: number): Promise<void> {
    await this.restaurantRepo.query(`
      UPDATE restaurants
      SET
        rating = COALESCE(
          (SELECT ROUND(AVG(rating_overall)::numeric, 2)
           FROM reviews WHERE restaurant_id = $1 AND status = 'approved'),
          0
        ),
        review_count = (
          SELECT COUNT(*) FROM reviews WHERE restaurant_id = $1 AND status = 'approved'
        )
      WHERE id = $1
    `, [id]);
  }

  // ─── Photos ──────────────────────────────────────────
  async uploadPhoto(restaurantId: number, file: Express.Multer.File, isCover: boolean): Promise<Photo> {
    if (!file) throw new BadRequestException('Файл не передан');

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Допустимые форматы: JPEG, PNG, WebP, AVIF');
    }

    await this.findById(restaurantId); // ensure exists

    const { original } = await this.storage.upload(file, `restaurants/${restaurantId}`);

    if (isCover) {
      await this.photoRepo.update({ restaurantId, isCover: true }, { isCover: false });
    }

    const maxSort = await this.photoRepo
      .createQueryBuilder('p')
      .select('COALESCE(MAX(p.sort_order), -1)', 'max')
      .where('p.restaurant_id = :restaurantId', { restaurantId })
      .getRawOne();

    const photo = this.photoRepo.create({
      restaurantId,
      url: original,
      isCover,
      source: 'internal',
      sortOrder: (maxSort?.max ?? -1) + 1,
    });

    return this.photoRepo.save(photo);
  }

  async removePhoto(restaurantId: number, photoId: number): Promise<void> {
    const photo = await this.photoRepo.findOneBy({ id: photoId, restaurantId });
    if (!photo) throw new NotFoundException('Фото не найдено');

    await this.storage.delete(photo.url);
    await this.photoRepo.remove(photo);
  }

  async setCoverPhoto(restaurantId: number, photoId: number): Promise<Photo> {
    const photo = await this.photoRepo.findOneBy({ id: photoId, restaurantId });
    if (!photo) throw new NotFoundException('Фото не найдено');

    await this.photoRepo.update({ restaurantId, isCover: true }, { isCover: false });
    photo.isCover = true;
    return this.photoRepo.save(photo);
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    let slug = slugify(name, { lower: true, strict: true, locale: 'ru' });
    let suffix = 0;
    let candidate = slug;

    while (await this.restaurantRepo.findOneBy({ slug: candidate })) {
      suffix++;
      candidate = `${slug}-${suffix}`;
    }

    return candidate;
  }
}
