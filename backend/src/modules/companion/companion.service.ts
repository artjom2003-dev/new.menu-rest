import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Companion } from '@database/entities/companion.entity';
import { User } from '@database/entities/user.entity';
import { NotificationService } from '@common/services/notification.service';

@Injectable()
export class CompanionService {
  constructor(
    @InjectRepository(Companion)
    private readonly companionRepo: Repository<Companion>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  async invite(userId: number, companionId: number) {
    if (userId === companionId) throw new BadRequestException('Нельзя пригласить самого себя');

    const target = await this.userRepo.findOneBy({ id: companionId });
    if (!target) throw new NotFoundException('Пользователь не найден');

    const sender = await this.userRepo.findOneBy({ id: userId });

    // Check if already exists in either direction
    const existing = await this.companionRepo.findOne({
      where: [
        { userId, companionId },
        { userId: companionId, companionId: userId },
      ],
    });

    let record: Companion;
    if (existing) {
      if (existing.status === 'accepted') throw new ConflictException('Уже в компании');
      if (existing.status === 'pending') throw new ConflictException('Приглашение уже отправлено');
      // If declined, allow re-invite
      if (existing.status === 'declined') {
        existing.status = 'pending';
        existing.userId = userId;
        existing.companionId = companionId;
        record = await this.companionRepo.save(existing);
      } else {
        record = existing;
      }
    } else {
      const companion = this.companionRepo.create({ userId, companionId, status: 'pending' });
      record = await this.companionRepo.save(companion);
    }

    // Send real-time notification to the target user
    this.notificationService.emit(companionId, 'companion:request', {
      id: record.id,
      user: {
        id: userId,
        name: sender?.name || 'Пользователь',
        avatarUrl: sender?.avatarUrl || null,
        loyaltyLevel: sender?.loyaltyLevel || 'bronze',
      },
      createdAt: record.createdAt,
    });

    return record;
  }

  async accept(id: number, userId: number) {
    const record = await this.companionRepo.findOneBy({ id });
    if (!record) throw new NotFoundException('Приглашение не найдено');
    if (record.companionId !== userId) throw new BadRequestException('Это приглашение не для вас');
    if (record.status !== 'pending') throw new BadRequestException('Приглашение уже обработано');

    record.status = 'accepted';
    const saved = await this.companionRepo.save(record);

    // Notify the sender that their request was accepted
    const acceptor = await this.userRepo.findOneBy({ id: userId });
    this.notificationService.emit(record.userId, 'companion:accepted', {
      id: saved.id,
      user: {
        id: userId,
        name: acceptor?.name || 'Пользователь',
        avatarUrl: acceptor?.avatarUrl || null,
        loyaltyLevel: acceptor?.loyaltyLevel || 'bronze',
      },
    });

    return saved;
  }

  async decline(id: number, userId: number) {
    const record = await this.companionRepo.findOneBy({ id });
    if (!record) throw new NotFoundException('Приглашение не найдено');
    if (record.companionId !== userId) throw new BadRequestException('Это приглашение не для вас');

    record.status = 'declined';
    return this.companionRepo.save(record);
  }

  async remove(id: number, userId: number) {
    const record = await this.companionRepo.findOneBy({ id });
    if (!record) throw new NotFoundException('Запись не найдена');
    if (record.userId !== userId && record.companionId !== userId) {
      throw new BadRequestException('Нет доступа');
    }
    await this.companionRepo.remove(record);
  }

  async getMyCompanions(userId: number) {
    const records = await this.companionRepo.find({
      where: [
        { userId, status: 'accepted' },
        { companionId: userId, status: 'accepted' },
      ],
      relations: ['user', 'companion'],
      order: { createdAt: 'DESC' },
    });

    return records.map(r => {
      const other = r.userId === userId ? r.companion : r.user;
      return {
        id: r.id,
        user: { id: other.id, name: other.name, avatarUrl: other.avatarUrl, loyaltyLevel: other.loyaltyLevel },
        since: r.createdAt,
      };
    });
  }

  async getPending(userId: number) {
    const records = await this.companionRepo.find({
      where: { companionId: userId, status: 'pending' },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return records.map(r => ({
      id: r.id,
      user: { id: r.user.id, name: r.user.name, avatarUrl: r.user.avatarUrl, loyaltyLevel: r.user.loyaltyLevel },
      createdAt: r.createdAt,
    }));
  }

  async getStatus(userId: number, otherUserId: number) {
    const record = await this.companionRepo.findOne({
      where: [
        { userId, companionId: otherUserId },
        { userId: otherUserId, companionId: userId },
      ],
    });
    if (!record) return { status: 'none', id: null };
    return { status: record.status, id: record.id, direction: record.userId === userId ? 'sent' : 'received' };
  }

  async getPendingCount(userId: number): Promise<number> {
    return this.companionRepo.count({
      where: { companionId: userId, status: 'pending' },
    });
  }

  async searchUsers(query: string, currentUserId: number) {
    if (!query || query.length < 2) return [];

    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.id != :currentUserId', { currentUserId })
      .andWhere('LOWER(u.name) LIKE LOWER(:q)', { q: `%${query}%` })
      .andWhere('u.blockMessages = false')
      .select(['u.id', 'u.name', 'u.avatarUrl', 'u.loyaltyLevel'])
      .limit(10)
      .getMany();

    return users.map(u => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl, loyaltyLevel: u.loyaltyLevel }));
  }
}
