import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import slugify from 'slugify';
import { Article } from '@database/entities/article.entity';
import { Restaurant } from '@database/entities/restaurant.entity';
import { CreateArticleDto, UpdateArticleDto } from './dto/create-article.dto';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
  ) {}

  async findAll(page = 1, limit = 10, status?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    else where.status = 'published';

    const [items, total] = await this.articleRepo.findAndCount({
      where,
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findBySlug(slug: string): Promise<Article> {
    const article = await this.articleRepo.findOne({
      where: { slug },
      relations: ['restaurants'],
    });
    if (!article) throw new NotFoundException(`Статья "${slug}" не найдена`);
    return article;
  }

  async create(dto: CreateArticleDto): Promise<Article> {
    const slug = await this.generateUniqueSlug(dto.title);
    const article = this.articleRepo.create({
      title: dto.title,
      slug,
      excerpt: dto.excerpt ?? null,
      body: dto.body,
      coverUrl: dto.coverUrl ?? null,
      seoTitle: dto.seoTitle ?? null,
      seoDescription: dto.seoDescription ?? null,
      status: 'draft',
    });

    if (dto.restaurantIds?.length) {
      article.restaurants = await this.restaurantRepo.findBy({ id: In(dto.restaurantIds) });
    }

    return this.articleRepo.save(article);
  }

  async update(id: number, dto: UpdateArticleDto): Promise<Article> {
    const article = await this.articleRepo.findOne({ where: { id }, relations: ['restaurants'] });
    if (!article) throw new NotFoundException(`Статья #${id} не найдена`);

    if (dto.restaurantIds !== undefined) {
      article.restaurants = dto.restaurantIds.length
        ? await this.restaurantRepo.findBy({ id: In(dto.restaurantIds) })
        : [];
    }

    // Если публикуем впервые, ставим дату
    if (dto.status === 'published' && !article.publishedAt) {
      article.publishedAt = new Date();
    }

    const { restaurantIds, ...rest } = dto;
    Object.assign(article, rest);
    return this.articleRepo.save(article);
  }

  async remove(id: number): Promise<void> {
    const article = await this.articleRepo.findOneBy({ id });
    if (!article) throw new NotFoundException(`Статья #${id} не найдена`);
    await this.articleRepo.remove(article);
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    let slug = slugify(title, { lower: true, strict: true, locale: 'ru' });
    let suffix = 0;
    let candidate = slug;

    while (await this.articleRepo.findOneBy({ slug: candidate })) {
      suffix++;
      candidate = `${slug}-${suffix}`;
    }

    return candidate;
  }
}
