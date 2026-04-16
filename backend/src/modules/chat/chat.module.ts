import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '@database/entities/conversation.entity';
import { Message } from '@database/entities/message.entity';
import { User } from '@database/entities/user.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { PickSessionModule } from '@modules/pick-session/pick-session.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, User]),
    PickSessionModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
