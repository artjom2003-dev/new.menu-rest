import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create order' })
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Get('restaurant/:restaurantId')
  @ApiOperation({ summary: 'List restaurant orders' })
  findByRestaurant(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Query('status') status?: string,
  ) {
    return this.service.findByRestaurant(restaurantId, status);
  }

  @Get('waiter/:waiterId')
  @ApiOperation({ summary: 'List waiter orders' })
  findByWaiter(@Param('waiterId', ParseIntPipe) waiterId: number) {
    return this.service.findByWaiter(waiterId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: { status: string }) {
    return this.service.updateStatus(id, dto.status);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add items to order' })
  addItems(@Param('id', ParseIntPipe) id: number, @Body() dto: { items: any[] }) {
    return this.service.addItems(id, dto.items);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Cancel order item' })
  cancelItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: { reason: string },
  ) {
    return this.service.cancelItem(id, itemId, dto.reason);
  }

  @Post(':id/check')
  @ApiOperation({ summary: 'Get pre-check' })
  getPreCheck(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPreCheck(id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close order (paid)' })
  closeOrder(@Param('id', ParseIntPipe) id: number) {
    return this.service.closeOrder(id);
  }
}
