import {
  Controller, Get, Post, Body, Query, UseGuards,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { LoyaltyService } from './loyalty.service';

@ApiTags('loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly service: LoyaltyService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Мой статус лояльности' })
  getStatus(@CurrentUser('id') userId: number) {
    return this.service.getStatus(userId);
  }

  @Post('add-points')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Начислить баллы (admin / internal)' })
  addPoints(
    @Body('userId') userId: number,
    @Body('action') action: string,
    @Body('points') points?: number,
  ) {
    return this.service.addPoints(userId, action, points);
  }

  @Post('redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Списать баллы за скидку' })
  redeemPoints(
    @CurrentUser('id') userId: number,
    @Body('points') points: number,
    @Body('restaurantId') restaurantId: number,
    @Body('orderTotal') orderTotal: number,
  ) {
    return this.service.redeemPoints(userId, points, restaurantId, orderTotal);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Топ пользователей по баллам' })
  @ApiQuery({ name: 'limit', required: false })
  getLeaderboard(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.service.getLeaderboard(limit);
  }

  @Get('leaderboard/weekly')
  @ApiOperation({ summary: 'Лидеры недели' })
  @ApiQuery({ name: 'limit', required: false })
  getWeeklyLeaderboard(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.service.getWeeklyLeaderboard(limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Общая статистика сообщества' })
  getCommunityStats() {
    return this.service.getCommunityStats();
  }
}
