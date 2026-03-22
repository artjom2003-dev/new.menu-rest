import {
  Controller, Get, Post, Patch, Param, Body,
  Query, ParseIntPipe, UseGuards, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ChatService } from './chat.service';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Мои диалоги' })
  getMyConversations(@CurrentUser('id') userId: number) {
    return this.service.getMyConversations(userId);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Создать или получить диалог' })
  getOrCreateConversation(
    @CurrentUser('id') userId: number,
    @Body('userId', ParseIntPipe) otherUserId: number,
  ) {
    return this.service.getOrCreateConversation(userId, otherUserId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Сообщения диалога' })
  @ApiQuery({ name: 'page', required: false })
  getMessages(
    @Param('id', ParseIntPipe) conversationId: number,
    @CurrentUser('id') userId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.service.getMessages(conversationId, userId, page);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Отправить сообщение' })
  sendMessage(
    @Param('id', ParseIntPipe) conversationId: number,
    @CurrentUser('id') userId: number,
    @Body('text') text: string,
  ) {
    return this.service.sendMessage(conversationId, userId, text);
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Прочитать сообщения' })
  markRead(
    @Param('id', ParseIntPipe) conversationId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.markRead(conversationId, userId);
  }
}
