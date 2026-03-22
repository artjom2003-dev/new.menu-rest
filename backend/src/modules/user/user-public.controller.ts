import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';

@ApiTags('users')
@Controller('users')
export class UserPublicController {
  constructor(private readonly service: UserService) {}

  @Get(':id/profile')
  @ApiOperation({ summary: 'Публичный профиль пользователя' })
  getPublicProfile(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPublicProfile(id);
  }
}

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantWishlistController {
  constructor(private readonly service: UserService) {}

  @Get(':id/wishlist-users')
  @ApiOperation({ summary: 'Кто хочет посетить этот ресторан' })
  getWishlistUsers(@Param('id', ParseIntPipe) id: number) {
    return this.service.getWishlistUsers(id);
  }
}

@ApiTags('listings')
@Controller('listings')
export class ListingPublicController {
  constructor(private readonly service: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Публичный список объявлений (вакансии / поставщики)' })
  getPublicListings(@Query('type') type?: 'job' | 'supplier') {
    return this.service.getPublicListings(type);
  }
}
