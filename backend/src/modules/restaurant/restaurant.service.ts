import {
  Injectable, NotFoundException, BadRequestException,
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
export class RestaurantService {
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

  async findAll(query: QueryRestaurantDto) {
    const { page = 1, limit = 20, city, cuisine, priceLevel, priceLevelMin, priceLevelMax, sortBy = 'rating', status = 'published', search, features, hasMenu, metro, district, venueType, lat, lng, radius = 10 } = query;

    const qb = this.restaurantRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.cuisines', 'c')
      .leftJoinAndSelect('r.city', 'city')
      .leftJoinAndSelect('r.photos', 'photo', 'photo.is_cover = true')
      .where('r.status = :status', { status });

    // Photos filter removed — show all published restaurants including those without photos

    if (search) {
      qb.andWhere('(r.name ILIKE :search OR r.description ILIKE :search OR c.name ILIKE :search)', { search: `%${search}%` });
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
        qb.leftJoin('r.features', 'feat')
          .andWhere('feat.slug IN (:...featureSlugs)', { featureSlugs });
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
      // Can't use addSelect+orderBy for distance with JOINs (causes duplicates)
      // So: get entities normally, compute distance in JS, sort
      const [entities, total] = await qb
        .orderBy('r.rating', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      const items = entities
        .map(e => ({
          ...e,
          distanceKm: e.lat && e.lng ? Math.round(haversine(lat, lng, Number(e.lat), Number(e.lng)) * 10) / 10 : undefined,
        }))
        .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

      return {
        items,
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }

    if (sortBy === 'rating') {
      qb.orderBy('r.rating', 'DESC');
    } else if (sortBy === 'created_at') {
      qb.orderBy('r.createdAt', 'DESC');
    } else {
      qb.orderBy('r.name', 'ASC');
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
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
