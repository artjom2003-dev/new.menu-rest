import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { ChatService } from './chat.service';
import { PickSessionService } from '@modules/pick-session/pick-session.service';
import { NotificationService } from '@common/services/notification.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly configService: ConfigService,
    private readonly pickSessionService: PickSessionService,
    private readonly notificationService: NotificationService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);

      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = jwt.verify(token, secret!) as unknown as { sub: number };
      const userId = payload.sub;

      (client as any).userId = userId;
      this.notificationService.register(userId, client);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId as number | undefined;
    if (userId) {
      this.notificationService.unregister(userId, client);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; text: string },
  ) {
    const userId = (client as any).userId as number;
    if (!userId) return;

    const message = await this.chatService.sendMessage(
      data.conversationId,
      userId,
      data.text,
    );

    const otherUserId = await this.getOtherUserFromConversation(
      data.conversationId,
      userId,
    );

    if (otherUserId) {
      const otherSocket = this.notificationService.getSocket(otherUserId);
      if (otherSocket) {
        otherSocket.emit('newMessage', message);
      }
    }

    return message;
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const userId = (client as any).userId as number;
    if (!userId) return;

    await this.chatService.markRead(data.conversationId, userId);

    const otherUserId = await this.getOtherUserFromConversation(
      data.conversationId,
      userId,
    );
    if (otherUserId) {
      const otherSocket = this.notificationService.getSocket(otherUserId);
      if (otherSocket) {
        otherSocket.emit('messagesRead', { conversationId: data.conversationId });
      }
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const userId = (client as any).userId as number;
    if (!userId) return;

    const otherUserId = await this.getOtherUserFromConversation(
      data.conversationId,
      userId,
    );
    if (otherUserId) {
      const otherSocket = this.notificationService.getSocket(otherUserId);
      if (otherSocket) {
        otherSocket.emit('userTyping', {
          conversationId: data.conversationId,
          userId,
        });
      }
    }
  }

  // ─── Pick Session events ───

  @SubscribeMessage('pickSession:create')
  async handlePickCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; mode: 'swipe' | 'vote'; filters?: Record<string, unknown>; restaurantIds?: number[] },
  ) {
    const userId = (client as any).userId as number;
    if (!userId) return;
    try {
      const session = await this.pickSessionService.createSession(userId, data.conversationId, data.mode, data.filters, data.restaurantIds);
      client.emit('pickSession:created', { session });
      const otherId = await this.getOtherUserFromConversation(data.conversationId, userId);
      if (otherId) this.notificationService.getSocket(otherId)?.emit('pickSession:created', { session });
    } catch (e) {
      client.emit('pickSession:error', { message: (e as Error).message });
    }
  }

  @SubscribeMessage('pickSession:swipe')
  async handlePickSwipe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: number; restaurantId: number; reaction: 'like' | 'dislike' | 'superlike' },
  ) {
    const userId = (client as any).userId as number;
    if (!userId) return;
    try {
      const result = await this.pickSessionService.submitVote(data.sessionId, userId, data.restaurantId, data.reaction);
      const session = await this.pickSessionService.getSession(data.sessionId, userId);
      const otherId = await this.getOtherUserFromConversation(session.conversationId, userId);
      if (otherId) {
        this.notificationService.getSocket(otherId)?.emit('pickSession:swiped', { sessionId: data.sessionId, restaurantId: data.restaurantId, userId });
      }
      if (result.match) {
        client.emit('pickSession:match', { sessionId: data.sessionId, restaurant: result.match });
        if (otherId) this.notificationService.getSocket(otherId)?.emit('pickSession:match', { sessionId: data.sessionId, restaurant: result.match });
      }
    } catch {}
  }

  @SubscribeMessage('pickSession:vote')
  async handlePickVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: number; restaurantId: number; reaction: 'like' | 'dislike' | 'superlike' },
  ) {
    const userId = (client as any).userId as number;
    if (!userId) return;
    try {
      await this.pickSessionService.submitVote(data.sessionId, userId, data.restaurantId, data.reaction);
      const session = await this.pickSessionService.getSession(data.sessionId, userId);
      const otherId = await this.getOtherUserFromConversation(session.conversationId, userId);
      if (otherId) {
        this.notificationService.getSocket(otherId)?.emit('pickSession:voted', { sessionId: data.sessionId, restaurantId: data.restaurantId, userId, reaction: data.reaction });
      }
    } catch {}
  }

  @SubscribeMessage('pickSession:complete')
  async handlePickComplete(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: number },
  ) {
    const userId = (client as any).userId as number;
    if (!userId) return;
    try {
      await this.pickSessionService.completeSession(data.sessionId, userId);
      const results = await this.pickSessionService.getResults(data.sessionId, userId);
      const session = await this.pickSessionService.getSession(data.sessionId, userId);
      const otherId = await this.getOtherUserFromConversation(session.conversationId, userId);
      client.emit('pickSession:completed', { sessionId: data.sessionId, results });
      if (otherId) this.notificationService.getSocket(otherId)?.emit('pickSession:completed', { sessionId: data.sessionId, results });
    } catch {}
  }

  @SubscribeMessage('pickSession:cancel')
  async handlePickCancel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: number },
  ) {
    const userId = (client as any).userId as number;
    if (!userId) return;
    try {
      const session = await this.pickSessionService.getSession(data.sessionId, userId);
      await this.pickSessionService.cancelSession(data.sessionId, userId);
      const otherId = await this.getOtherUserFromConversation(session.conversationId, userId);
      if (otherId) this.notificationService.getSocket(otherId)?.emit('pickSession:cancelled', { sessionId: data.sessionId, userId });
    } catch {}
  }

  private async getOtherUserFromConversation(
    conversationId: number,
    userId: number,
  ): Promise<number | null> {
    try {
      // Use a lightweight query to get the conversation
      const conv = await this.chatService['conversationRepo'].findOneBy({
        id: conversationId,
      });
      if (!conv) return null;
      return this.chatService.getOtherUserId(conv, userId);
    } catch {
      return null;
    }
  }
}
