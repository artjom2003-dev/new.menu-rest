import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '@database/entities/order.entity';
import { OrderItem } from '@database/entities/order-item.entity';
import { OrderStatusHistory } from '@database/entities/order-status-history.entity';
import { Table } from '@database/entities/table.entity';
import { RestaurantDish } from '@database/entities/restaurant-dish.entity';
import { TablesModule } from '@modules/tables/tables.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderStatusHistory, Table, RestaurantDish]),
    TablesModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway],
  exports: [OrdersService],
})
export class OrdersModule {}
