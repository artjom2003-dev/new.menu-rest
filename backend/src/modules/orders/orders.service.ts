import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '@database/entities/order.entity';
import { OrderItem } from '@database/entities/order-item.entity';
import { OrderStatusHistory } from '@database/entities/order-status-history.entity';
import { RestaurantDish } from '@database/entities/restaurant-dish.entity';
import { TablesService } from '@modules/tables/tables.service';
import { OrdersGateway } from './orders.gateway';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory) private readonly historyRepo: Repository<OrderStatusHistory>,
    @InjectRepository(RestaurantDish) private readonly dishRepo: Repository<RestaurantDish>,
    private readonly tablesService: TablesService,
    @Inject(forwardRef(() => OrdersGateway)) private readonly gateway: OrdersGateway,
  ) {}

  async create(dto: {
    restaurantId: number;
    tableId: number;
    source: string;
    waiterId?: number;
    sessionId?: string;
    userId?: number;
    comment?: string;
    items: { dishId: number; quantity: number; comment?: string }[];
  }): Promise<Order> {
    const orderItems: Partial<OrderItem>[] = [];
    let total = 0;

    for (const item of dto.items) {
      const dish = await this.dishRepo.findOne({ where: { id: item.dishId }, relations: ['dish'] });
      if (!dish) throw new BadRequestException(`Dish ${item.dishId} not found`);
      if (!dish.isAvailable) throw new BadRequestException(`Dish ${dish.dish?.name || item.dishId} is not available`);
      const lineTotal = dish.price * item.quantity;
      total += lineTotal;
      orderItems.push({
        dishId: item.dishId,
        dishName: dish.dish?.name || `Dish #${item.dishId}`,
        quantity: item.quantity,
        unitPrice: dish.price,
        station: dish.station,
        comment: item.comment,
      });
    }

    const order = this.orderRepo.create({
      restaurantId: dto.restaurantId,
      tableId: dto.tableId,
      source: dto.source as any,
      waiterId: dto.waiterId,
      sessionId: dto.sessionId,
      userId: dto.userId,
      comment: dto.comment,
      totalAmount: total,
      items: orderItems as OrderItem[],
    });

    const saved = await this.orderRepo.save(order);

    // Update table status
    try {
      await this.tablesService.updateStatus(dto.tableId, 'occupied', {
        currentOrderId: saved.id,
        occupiedSince: new Date(),
      } as any);
    } catch {}

    // Log history
    await this.historyRepo.save({
      orderId: saved.id,
      status: 'pending',
      changedByRole: dto.source,
    });

    const fullOrder = await this.findById(saved.id);

    // Emit WebSocket event
    this.gateway.emitOrderCreated(dto.restaurantId, fullOrder);

    return fullOrder;
  }

  async findById(id: number): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findByRestaurant(restaurantId: number, status?: string): Promise<Order[]> {
    const where: any = { restaurantId };
    if (status) where.status = status;
    return this.orderRepo.find({
      where,
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByWaiter(waiterId: number): Promise<Order[]> {
    return this.orderRepo.find({
      where: { waiterId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: number, status: string, changedBy?: number, changedByRole?: string): Promise<Order> {
    const order = await this.findById(id);
    order.status = status as any;
    await this.orderRepo.save(order);

    await this.historyRepo.save({
      orderId: id,
      status,
      changedBy,
      changedByRole,
    });

    if (status === 'paid' || status === 'cancelled') {
      try {
        await this.tablesService.updateStatus(order.tableId, 'free', {
          currentOrderId: null,
          guestCount: null,
          occupiedSince: null,
        } as any);
      } catch {}
    }

    // Emit WebSocket event
    this.gateway.emitOrderStatusChanged(order.restaurantId, { orderId: id, status });

    return this.findById(id);
  }

  async addItems(orderId: number, items: { dishId: number; quantity: number; comment?: string }[]): Promise<Order> {
    const order = await this.findById(orderId);
    let addedTotal = 0;

    for (const item of items) {
      const dish = await this.dishRepo.findOne({ where: { id: item.dishId }, relations: ['dish'] });
      if (!dish) throw new BadRequestException(`Dish ${item.dishId} not found`);
      const lineTotal = dish.price * item.quantity;
      addedTotal += lineTotal;
      await this.itemRepo.save({
        orderId,
        dishId: item.dishId,
        dishName: dish.dish?.name || `Dish #${item.dishId}`,
        quantity: item.quantity,
        unitPrice: dish.price,
        station: dish.station,
        comment: item.comment,
      });
    }

    order.totalAmount += addedTotal;
    await this.orderRepo.save(order);

    const updated = await this.findById(orderId);
    // Emit WebSocket event
    this.gateway.emitOrderItemAdded(order.restaurantId, { orderId, items: updated.items });

    return updated;
  }

  async cancelItem(orderId: number, itemId: number, reason: string): Promise<Order> {
    const item = await this.itemRepo.findOneBy({ id: itemId, orderId });
    if (!item) throw new NotFoundException('Order item not found');
    if (item.status === 'preparing') throw new BadRequestException('Cannot cancel item already being prepared');
    item.status = 'cancelled';
    item.cancelledReason = reason;
    await this.itemRepo.save(item);

    // Recalculate total
    const order = await this.findById(orderId);
    const activeItems = order.items.filter(i => i.status !== 'cancelled');
    order.totalAmount = activeItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    await this.orderRepo.save(order);
    return this.findById(orderId);
  }

  async getPreCheck(orderId: number) {
    const order = await this.findById(orderId);
    const activeItems = order.items.filter(i => i.status !== 'cancelled');
    return {
      orderId: order.id,
      tableId: order.tableId,
      items: activeItems.map(i => ({
        name: i.dishName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.unitPrice * i.quantity,
      })),
      totalAmount: activeItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    };
  }

  async closeOrder(orderId: number): Promise<Order> {
    return this.updateStatus(orderId, 'paid');
  }
}
