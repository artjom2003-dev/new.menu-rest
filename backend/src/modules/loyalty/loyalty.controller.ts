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

  @Get('leaderboard')
  @ApiOperation({ summary: 'Топ пользователей по баллам' })
  @ApiQuery({ name: 'limit', required: false })
  getLeaderboard(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.service.getLeaderboard(limit);
  }
}
