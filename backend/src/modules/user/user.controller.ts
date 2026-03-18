import { Controller, Get, Patch, Post, Body, UseGuards, Request, ParseIntPipe, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { UserService } from './user.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Профиль текущего пользователя' })
  getMe(@Request() req: { user: { id: number } }) {
    return this.service.getMe(req.user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить профиль' })
  updateMe(@Request() req: { user: { id: number } }, @Body() dto: Record<string, unknown>) {
    return this.service.updateMe(req.user.id, dto as never);
  }

  @Get('favorites')
  @ApiOperation({ summary: 'Избранные рестораны' })
  async getFavorites(@Request() req: { user: { id: number } }) {
    const user = await this.service.getMe(req.user.id);
    return user.favoriteRestaurants;
  }

  @Post('favorites')
  @ApiOperation({ summary: 'Добавить/убрать из избранного' })
  toggleFavorite(
    @Request() req: { user: { id: number } },
    @Body('restaurantId', ParseIntPipe) restaurantId: number,
  ) {
    return this.service.toggleFavorite(req.user.id, restaurantId);
  }

  // ─── Owner: My Restaurant ───────────────────────────
  @Get('restaurant')
  @ApiOperation({ summary: 'Ресторан владельца' })
  getMyRestaurant(@Request() req: { user: { id: number } }) {
    return this.service.getMyRestaurant(req.user.id);
  }

  @Patch('restaurant')
  @ApiOperation({ summary: 'Обновить карточку своего ресторана' })
  updateMyRestaurant(
    @Request() req: { user: { id: number } },
    @Body() dto: Record<string, unknown>,
  ) {
    return this.service.updateMyRestaurant(req.user.id, dto);
  }

  @Get('restaurant/posts')
  @ApiOperation({ summary: 'Посты (акции/новости/афиши) моего ресторана' })
  getMyRestaurantPosts(@Request() req: { user: { id: number } }) {
    return this.service.getMyRestaurantPosts(req.user.id);
  }

  @Post('restaurant/posts')
  @ApiOperation({ summary: 'Создать пост для своего ресторана' })
  createMyRestaurantPost(
    @Request() req: { user: { id: number } },
    @Body() dto: { title: string; body: string; category: string },
  ) {
    return this.service.createMyRestaurantPost(req.user.id, dto);
  }
}
