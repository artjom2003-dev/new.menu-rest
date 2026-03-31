import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '@database/entities/booking.entity';
import { LoyaltyService } from '@modules/loyalty/loyalty.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  async create(userId: number | null, dto: CreateBookingDto): Promise<Booking> {
    const booking = this.bookingRepo.create({
      userId: userId || undefined,
      restaurantId: dto.restaurantId,
      bookingDate: dto.bookingDate,
      bookingTime: dto.bookingTime,
      guestsCount: dto.guestsCount,
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      comment: dto.comment ?? null,
      status: 'pending',
    });
    return this.bookingRepo.save(booking);
  }

  async findMyBookings(userId: number, page = 1, limit = 10) {
    const [items, total] = await this.bookingRepo.findAndCount({
      where: { userId },
      relations: ['restaurant'],
      order: { bookingDate: 'DESC', bookingTime: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findById(id: number): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: ['restaurant', 'user'],
    });
    if (!booking) throw new NotFoundException(`Бронь #${id} не найдена`);
    return booking;
  }

  async cancel(id: number, userId: number): Promise<Booking> {
    const booking = await this.findById(id);
    if (booking.userId !== userId) throw new ForbiddenException('Нельзя отменить чужую бронь');
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      throw new ForbiddenException('Бронь нельзя отменить в текущем статусе');
    }
    booking.status = 'cancelled';
    return this.bookingRepo.save(booking);
  }

  async updateStatus(id: number, status: BookingStatus): Promise<Booking> {
    const booking = await this.findById(id);
    booking.status = status;
    const saved = await this.bookingRepo.save(booking);

    // Auto-award loyalty points when booking is completed
    if (status === 'completed') {
      await this.loyaltyService.addPoints(booking.userId, 'booking');
    }

    return saved;
  }

  async findByRestaurant(restaurantId: number, date?: string, page = 1, limit = 20) {
    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.user', 'u')
      .where('b.restaurant_id = :restaurantId', { restaurantId })
      .orderBy('b.booking_date', 'DESC')
      .addOrderBy('b.booking_time', 'ASC');

    if (date) {
      qb.andWhere('b.booking_date = :date', { date });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }
}
