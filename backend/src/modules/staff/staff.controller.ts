import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StaffService } from './staff.service';

@ApiTags('staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly service: StaffService) {}

  @Post('restaurant/:restaurantId')
  @ApiOperation({ summary: 'Create staff account' })
  create(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: { name: string; pin: string; role?: string },
  ) {
    return this.service.create(restaurantId, dto);
  }

  @Post('auth')
  @ApiOperation({ summary: 'Staff auth by PIN' })
  auth(@Body() dto: { restaurantId: number; pin: string }) {
    return this.service.authByPin(dto.restaurantId, dto.pin);
  }

  @Get('restaurant/:restaurantId')
  @ApiOperation({ summary: 'List staff for restaurant' })
  findByRestaurant(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.service.findByRestaurant(restaurantId);
  }

  @Post(':staffId/assign-table')
  @ApiOperation({ summary: 'Assign table to staff' })
  assignTable(
    @Param('staffId', ParseIntPipe) staffId: number,
    @Body() dto: { tableId: number; shiftDate: string },
  ) {
    return this.service.assignTable(staffId, dto.tableId, dto.shiftDate);
  }
}
