import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class NotificationService {
  private userSockets = new Map<number, Socket>();

  register(userId: number, socket: Socket) {
    this.userSockets.set(userId, socket);
  }

  unregister(userId: number, socket: Socket) {
    if (this.userSockets.get(userId) === socket) {
      this.userSockets.delete(userId);
    }
  }

  getSocket(userId: number): Socket | undefined {
    return this.userSockets.get(userId);
  }

  emit(userId: number, event: string, data: unknown) {
    const socket = this.userSockets.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }
}
