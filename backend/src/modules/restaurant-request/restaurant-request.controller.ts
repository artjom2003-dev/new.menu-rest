import {
  Controller, Get, Post, Patch, Param, Body, Query,
  ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { RestaurantRequestService } from './restaurant-request.service';
import { CreateRestaurantRequestDto } from './dto/create-restaurant-request.dto';
import { RestaurantRequestStatus } from '@database/entities/restaurant-request.entity';

@ApiTags('restaurant-requests')
@Controller('restaurant-requests')
export class RestaurantRequestController {
  constructor(private readonly service: RestaurantRequestService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a restaurant registration request (public)' })
  create(@Body() dto: CreateRestaurantRequestDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all requests (admin)' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  findAll(@Query('status') status?: RestaurantRequestStatus) {
    return this.service.findAll(status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get request by ID (admin)' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update request status (admin)' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: RestaurantRequestStatus,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.service.updateStatus(id, status, adminNote);
  }
}
