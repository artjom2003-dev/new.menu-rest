import { Controller, Get, Put, Patch, Post, Delete, Body, Param, UseGuards, Request, ParseIntPipe, NotFoundException, ForbiddenException, UseInterceptors, UploadedFile, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post('avatar')
  @ApiOperation({ summary: 'Загрузить аватар' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadAvatar(
    @Request() req: { user: { id: number } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadAvatar(req.user.id, file);
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

  @Get('wishlist')
  @ApiOperation({ summary: 'Список «Хочу сходить»' })
  getWishlist(@Request() req: { user: { id: number } }) {
    return this.service.getWishlist(req.user.id);
  }

  @Post('wishlist')
  @ApiOperation({ summary: 'Добавить/убрать из «Хочу сходить»' })
  toggleWishlist(
    @Request() req: { user: { id: number } },
    @Body('restaurantId', ParseIntPipe) restaurantId: number,
  ) {
    return this.service.toggleWishlist(req.user.id, restaurantId);
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

  // ─── Owner: Listings ──────────────────────────────────

  @Get('restaurant/listings')
  @ApiOperation({ summary: 'Объявления моего ресторана' })
  getMyListings(@Request() req: { user: { id: number } }) {
    return this.service.getMyListings(req.user.id);
  }

  @Post('restaurant/listings')
  @ApiOperation({ summary: 'Создать объявление (вакансия / поставщик)' })
  createListing(
    @Request() req: { user: { id: number } },
    @Body() dto: { type: 'job' | 'supplier'; title: string; description?: string; category?: string; salary?: string; contactInfo?: string },
  ) {
    return this.service.createListing(req.user.id, dto);
  }

  @Delete('restaurant/listings/:id')
  @ApiOperation({ summary: 'Удалить объявление' })
  deleteListing(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteListing(req.user.id, id);
  }

  // ─── Owner: Working Hours ──────────────────────────────

  @Put('restaurant/working-hours')
  @ApiOperation({ summary: 'Обновить время работы ресторана' })
  updateWorkingHours(
    @Request() req: { user: { id: number } },
    @Body() dto: { hours: Array<{ dayOfWeek: number; openTime: string | null; closeTime: string | null; isClosed: boolean }> },
  ) {
    return this.service.updateMyWorkingHours(req.user.id, dto.hours);
  }

  // ─── Owner: Features ───────────────────────────────────

  @Put('restaurant/features')
  @ApiOperation({ summary: 'Обновить особенности ресторана' })
  updateFeatures(
    @Request() req: { user: { id: number } },
    @Body() dto: { featureIds: number[] },
  ) {
    return this.service.updateMyFeatures(req.user.id, dto.featureIds);
  }

  // ─── Owner: Menu ───────────────────────────────────────

  @Get('restaurant/menu')
  @ApiOperation({ summary: 'Меню моего ресторана' })
  getMyMenu(@Request() req: { user: { id: number } }) {
    return this.service.getMyMenu(req.user.id);
  }

  @Post('restaurant/menu/dishes')
  @ApiOperation({ summary: 'Добавить блюдо в меню' })
  createMyDish(
    @Request() req: { user: { id: number } },
    @Body() dto: { name: string; description?: string; composition?: string; categoryName?: string; price?: number; weightGrams?: number; volumeMl?: number; calories?: number; protein?: number; fat?: number; carbs?: number },
  ) {
    return this.service.createMyDish(req.user.id, dto);
  }

  @Patch('restaurant/menu/dishes/:id')
  @ApiOperation({ summary: 'Обновить блюдо в меню' })
  updateMyDish(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.service.updateMyDish(req.user.id, id, dto as never);
  }

  @Delete('restaurant/menu/dishes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить блюдо из меню' })
  deleteMyDish(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteMyDish(req.user.id, id);
  }

  @Post('restaurant/menu/upload-pdf')
  @ApiOperation({ summary: 'Загрузить PDF-меню' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  uploadMenuPdf(
    @Request() req: { user: { id: number } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadMyMenuPdf(req.user.id, file);
  }
}
