import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CompanionService } from './companion.service';

@ApiTags('companions')
@Controller('companions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CompanionController {
  constructor(private readonly service: CompanionService) {}

  @Post('invite')
  @ApiOperation({ summary: 'Пригласить в компанию' })
  invite(@CurrentUser('id') userId: number, @Body('userId', ParseIntPipe) companionId: number) {
    return this.service.invite(userId, companionId);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Принять приглашение' })
  accept(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.service.accept(id, userId);
  }

  @Patch(':id/decline')
  @ApiOperation({ summary: 'Отклонить приглашение' })
  decline(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.service.decline(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить из компании' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.service.remove(id, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Моя компания' })
  getMyCompanions(@CurrentUser('id') userId: number) {
    return this.service.getMyCompanions(userId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Входящие приглашения' })
  getPending(@CurrentUser('id') userId: number) {
    return this.service.getPending(userId);
  }

  @Get('status/:userId')
  @ApiOperation({ summary: 'Статус отношений с пользователем' })
  getStatus(@CurrentUser('id') userId: number, @Param('userId', ParseIntPipe) otherUserId: number) {
    return this.service.getStatus(userId, otherUserId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Поиск пользователей' })
  @ApiQuery({ name: 'q', required: true })
  searchUsers(@Query('q') query: string, @CurrentUser('id') userId: number) {
    return this.service.searchUsers(query, userId);
  }
}
