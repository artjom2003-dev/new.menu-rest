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

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<number, Socket>();

  constructor(
    private readonly chatService: ChatService,
    private readonly configService: ConfigService,
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
      this.userSockets.set(userId, client);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId as number | undefined;
    if (userId && this.userSockets.get(userId) === client) {
      this.userSockets.delete(userId);
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
      const otherSocket = this.userSockets.get(otherUserId);
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
      const otherSocket = this.userSockets.get(otherUserId);
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
      const otherSocket = this.userSockets.get(otherUserId);
      if (otherSocket) {
        otherSocket.emit('userTyping', {
          conversationId: data.conversationId,
          userId,
        });
      }
    }
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
