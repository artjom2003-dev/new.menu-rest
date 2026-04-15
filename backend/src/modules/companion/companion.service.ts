import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Companion } from '@database/entities/companion.entity';
import { User } from '@database/entities/user.entity';

@Injectable()
export class CompanionService {
  constructor(
    @InjectRepository(Companion)
    private readonly companionRepo: Repository<Companion>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async invite(userId: number, companionId: number) {
    if (userId === companionId) throw new BadRequestException('Нельзя пригласить самого себя');

    const target = await this.userRepo.findOneBy({ id: companionId });
    if (!target) throw new NotFoundException('Пользователь не найден');

    // Check if already exists in either direction
    const existing = await this.companionRepo.findOne({
      where: [
        { userId, companionId },
        { userId: companionId, companionId: userId },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') throw new ConflictException('Уже в компании');
      if (existing.status === 'pending') throw new ConflictException('Приглашение уже отправлено');
      // If declined, allow re-invite
      if (existing.status === 'declined') {
        existing.status = 'pending';
        existing.userId = userId;
        existing.companionId = companionId;
        return this.companionRepo.save(existing);
      }
    }

    const companion = this.companionRepo.create({ userId, companionId, status: 'pending' });
    return this.companionRepo.save(companion);
  }

  async accept(id: number, userId: number) {
    const record = await this.companionRepo.findOneBy({ id });
    if (!record) throw new NotFoundException('Приглашение не найдено');
    if (record.companionId !== userId) throw new BadRequestException('Это приглашение не для вас');
    if (record.status !== 'pending') throw new BadRequestException('Приглашение уже обработано');

    record.status = 'accepted';
    return this.companionRepo.save(record);
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

  async searchUsers(query: string, currentUserId: number) {
    if (!query || query.length < 2) return [];

    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.id != :currentUserId', { currentUserId })
      .andWhere('LOWER(u.name) LIKE LOWER(:q)', { q: `%${query}%` })
      .andWhere('u.block_messages = false')
      .select(['u.id', 'u.name', 'u.avatarUrl', 'u.loyaltyLevel'])
      .limit(10)
      .getMany();

    return users.map(u => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl, loyaltyLevel: u.loyaltyLevel }));
  }
}
