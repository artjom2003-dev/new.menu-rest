import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PickSessionService } from './pick-session.service';

@ApiTags('pick-sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pick-sessions')
export class PickSessionController {
  constructor(private readonly service: PickSessionService) {}

  @Post()
  create(
    @Request() req: { user: { id: number } },
    @Body() dto: { conversationId: number; mode: 'swipe' | 'vote'; filters?: Record<string, unknown>; restaurantIds?: number[] },
  ) {
    return this.service.createSession(req.user.id, dto.conversationId, dto.mode, dto.filters, dto.restaurantIds);
  }

  @Get('active')
  getActive(
    @Request() req: { user: { id: number } },
    @Query('conversationId', ParseIntPipe) conversationId: number,
  ) {
    return this.service.getActiveSession(conversationId, req.user.id);
  }

  @Get(':id')
  getSession(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.getSession(id, req.user.id);
  }

  @Get(':id/next-card')
  getNextCard(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.getNextCard(id, req.user.id);
  }

  @Get(':id/restaurants')
  getRestaurants(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.getSessionRestaurants(id, req.user.id);
  }

  @Post(':id/votes')
  submitVote(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { restaurantId: number; reaction: 'like' | 'dislike' | 'superlike' },
  ) {
    return this.service.submitVote(id, req.user.id, dto.restaurantId, dto.reaction);
  }

  @Get(':id/results')
  getResults(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.getResults(id, req.user.id);
  }

  @Patch(':id/complete')
  complete(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.completeSession(id, req.user.id);
  }

  @Patch(':id/cancel')
  cancel(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.cancelSession(id, req.user.id);
  }
}
