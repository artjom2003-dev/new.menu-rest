import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/orders',
  cors: { origin: '*' },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(OrdersGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:restaurant')
  handleJoinRestaurant(@ConnectedSocket() client: Socket, @MessageBody() data: { restaurantId: number }) {
    const room = `restaurant:${data.restaurantId}`;
    client.join(room);
    this.logger.log(`${client.id} joined ${room}`);
  }

  @SubscribeMessage('join:table')
  handleJoinTable(@ConnectedSocket() client: Socket, @MessageBody() data: { tableId: number }) {
    client.join(`table:${data.tableId}`);
  }

  @SubscribeMessage('join:waiter')
  handleJoinWaiter(@ConnectedSocket() client: Socket, @MessageBody() data: { waiterId: number }) {
    client.join(`waiter:${data.waiterId}`);
  }

  @SubscribeMessage('join:kds')
  handleJoinKds(@ConnectedSocket() client: Socket, @MessageBody() data: { restaurantId: number; station?: string }) {
    client.join(`kds:${data.restaurantId}`);
    if (data.station) client.join(`kds:${data.restaurantId}:${data.station}`);
  }

  // Emit methods called from OrdersService
  emitOrderCreated(restaurantId: number, order: any) {
    this.server.to(`restaurant:${restaurantId}`).emit('order:created', order);
    this.server.to(`kds:${restaurantId}`).emit('order:created', order);
    if (order.waiterId) this.server.to(`waiter:${order.waiterId}`).emit('order:created', order);
  }

  emitOrderStatusChanged(restaurantId: number, data: { orderId: number; status: string; itemId?: number }) {
    this.server.to(`restaurant:${restaurantId}`).emit('order:status_changed', data);
    this.server.to(`table:${data.orderId}`).emit('order:status_changed', data);
  }

  emitOrderItemAdded(restaurantId: number, data: { orderId: number; items: any[] }) {
    this.server.to(`kds:${restaurantId}`).emit('order:item_added', data);
    this.server.to(`restaurant:${restaurantId}`).emit('order:item_added', data);
  }

  emitCallWaiter(restaurantId: number, data: { tableId: number; tableNumber: number }) {
    this.server.to(`restaurant:${restaurantId}`).emit('table:call_waiter', data);
  }

  emitRequestCheck(restaurantId: number, data: { tableId: number; orderId: number }) {
    this.server.to(`restaurant:${restaurantId}`).emit('table:request_check', data);
  }

  emitStopList(restaurantId: number, data: { dishId: number; isAvailable: boolean }) {
    this.server.to(`restaurant:${restaurantId}`).emit('dish:stop_list', data);
  }
}
