import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TablesService } from './tables.service';

@ApiTags('tables')
@Controller('tables')
export class TablesController {
  constructor(private readonly service: TablesService) {}

  @Get('restaurant/:restaurantId')
  @ApiOperation({ summary: 'Get all tables for restaurant' })
  findByRestaurant(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.service.findByRestaurant(restaurantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get table by ID' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post('restaurant/:restaurantId')
  @ApiOperation({ summary: 'Create table' })
  create(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: { number: number; zone?: string; capacity?: number },
  ) {
    return this.service.create(restaurantId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update table status' })
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: { status: string }) {
    return this.service.updateStatus(id, dto.status);
  }

  @Post(':id/transfer')
  @ApiOperation({ summary: 'Transfer order to another table' })
  transfer(@Param('id', ParseIntPipe) id: number, @Body() dto: { targetTableId: number }) {
    return this.service.transfer(id, dto.targetTableId);
  }

  @Post(':id/call-waiter')
  @ApiOperation({ summary: 'Guest calls waiter' })
  callWaiter(@Param('id', ParseIntPipe) id: number) {
    // TODO: emit WebSocket event
    return { success: true, tableId: id };
  }

  @Post(':id/request-check')
  @ApiOperation({ summary: 'Guest requests check' })
  requestCheck(@Param('id', ParseIntPipe) id: number) {
    return this.service.updateStatus(id, 'check_requested');
  }
}
