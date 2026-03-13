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
    const { page = 1, limit = 20, city, cuisine, priceLevel, priceLevelMin, priceLevelMax, sortBy = 'rating', status = 'published', search, features } = query;

    const qb = this.restaurantRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.cuisines', 'c')
      .leftJoinAndSelect('r.city', 'city')
      .leftJoinAndSelect('r.photos', 'photo', 'photo.is_cover = true')
      .where('r.status = :status', { status })
      .andWhere(`EXISTS (SELECT 1 FROM photos p WHERE p.restaurant_id = r.id AND p.url LIKE 'http%')`);

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

    if (features) {
      const featureSlugs = features.split(',').map(s => s.trim()).filter(Boolean);
      if (featureSlugs.length) {
        qb.leftJoin('r.features', 'feat')
          .andWhere('feat.slug IN (:...featureSlugs)', { featureSlugs });
      }
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
      relations: ['cuisines', 'city', 'photos', 'workingHours', 'chain'],
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
