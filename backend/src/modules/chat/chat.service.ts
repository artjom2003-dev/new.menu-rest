import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '@database/entities/conversation.entity';
import { Message } from '@database/entities/message.entity';
import { User } from '@database/entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getOrCreateConversation(userId1: number, userId2: number): Promise<Conversation> {
    // Check if target user blocks messages
    const target = await this.userRepo.findOne({ where: { id: userId2 } });
    if (target?.blockMessages) {
      throw new ForbiddenException('Пользователь запретил входящие сообщения');
    }

    const p1 = Math.min(userId1, userId2);
    const p2 = Math.max(userId1, userId2);

    let conversation = await this.conversationRepo.findOne({
      where: { participant1Id: p1, participant2Id: p2 },
      relations: ['participant1', 'participant2'],
    });

    if (!conversation) {
      conversation = this.conversationRepo.create({
        participant1Id: p1,
        participant2Id: p2,
        createdById: userId1,
      });
      conversation = await this.conversationRepo.save(conversation);
      conversation = await this.conversationRepo.findOne({
        where: { id: conversation.id },
        relations: ['participant1', 'participant2'],
      }) as Conversation;
    }

    return conversation;
  }

  async getMyConversations(userId: number) {
    const conversations = await this.conversationRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.participant1', 'p1')
      .leftJoinAndSelect('c.participant2', 'p2')
      .where('c.participant1Id = :userId OR c.participant2Id = :userId', { userId })
      .orderBy('c.lastMessageAt', 'DESC', 'NULLS LAST')
      .getMany();

    const result = await Promise.all(
      conversations.map(async (conv) => {
        const other = conv.participant1Id === userId ? conv.participant2 : conv.participant1;

        const lastMessage = await this.messageRepo.findOne({
          where: { conversationId: conv.id },
          order: { createdAt: 'DESC' },
        });

        const unreadCount = await this.messageRepo
          .createQueryBuilder('m')
          .where('m.conversation_id = :convId', { convId: conv.id })
          .andWhere('m.sender_id != :userId', { userId })
          .andWhere('m.read_at IS NULL')
          .getCount();

        return {
          id: conv.id,
          otherUser: {
            id: other.id,
            name: other.name,
            avatarUrl: other.avatarUrl,
          },
          lastMessage: lastMessage
            ? { text: lastMessage.text, createdAt: lastMessage.createdAt, senderId: lastMessage.senderId }
            : null,
          unreadCount,
          lastMessageAt: conv.lastMessageAt,
          createdAt: conv.createdAt,
          name: conv.name,
          createdById: conv.createdById,
        };
      }),
    );

    return result;
  }

  async getMessages(conversationId: number, userId: number, page = 1) {
    const conversation = await this.conversationRepo.findOneBy({ id: conversationId });
    if (!conversation) throw new NotFoundException('Диалог не найден');
    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new ForbiddenException('Нет доступа к этому диалогу');
    }

    const limit = 20;
    const [items, total] = await this.messageRepo.findAndCount({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const mapped = items.map(m => ({
      id: m.id,
      text: m.text,
      senderId: m.senderId,
      conversationId: m.conversationId,
      createdAt: m.createdAt,
      read: !!m.readAt,
    }));

    return { items: mapped, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async sendMessage(conversationId: number, senderId: number, text: string) {
    const conversation = await this.conversationRepo.findOneBy({ id: conversationId });
    if (!conversation) throw new NotFoundException('Диалог не найден');
    if (conversation.participant1Id !== senderId && conversation.participant2Id !== senderId) {
      throw new ForbiddenException('Нет доступа к этому диалогу');
    }

    const message = this.messageRepo.create({
      conversationId,
      senderId,
      text,
    });
    const saved = await this.messageRepo.save(message);

    conversation.lastMessageAt = new Date();
    await this.conversationRepo.save(conversation);

    return {
      id: saved.id,
      text: saved.text,
      senderId: saved.senderId,
      conversationId: saved.conversationId,
      createdAt: saved.createdAt,
      read: false,
    };
  }

  async markRead(conversationId: number, userId: number): Promise<void> {
    const conversation = await this.conversationRepo.findOneBy({ id: conversationId });
    if (!conversation) throw new NotFoundException('Диалог не найден');
    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw new ForbiddenException('Нет доступа к этому диалогу');
    }

    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: new Date() })
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('sender_id != :userId', { userId })
      .andWhere('read_at IS NULL')
      .execute();
  }

  async getUnreadCount(userId: number): Promise<{ count: number }> {
    const count = await this.messageRepo
      .createQueryBuilder('m')
      .innerJoin('m.conversation', 'c')
      .where('(c.participant1_id = :userId OR c.participant2_id = :userId)', { userId })
      .andWhere('m.sender_id != :userId', { userId })
      .andWhere('m.read_at IS NULL')
      .getCount();
    return { count };
  }

  async renameConversation(conversationId: number, userId: number, name: string) {
    const conversation = await this.conversationRepo.findOneBy({ id: conversationId });
    if (!conversation) throw new NotFoundException('Диалог не найден');
    if (conversation.createdById !== userId) {
      throw new ForbiddenException('Только создатель может переименовать диалог');
    }
    conversation.name = name?.trim() || null;
    return this.conversationRepo.save(conversation);
  }

  getOtherUserId(conversation: Conversation, userId: number): number {
    return conversation.participant1Id === userId
      ? conversation.participant2Id
      : conversation.participant1Id;
  }
}
