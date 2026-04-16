import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PickSession } from '@database/entities/pick-session.entity';
import { PickVote } from '@database/entities/pick-vote.entity';
import { Conversation } from '@database/entities/conversation.entity';
import { Restaurant } from '@database/entities/restaurant.entity';
import { PickSessionService } from './pick-session.service';
import { PickSessionController } from './pick-session.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PickSession, PickVote, Conversation, Restaurant])],
  controllers: [PickSessionController],
  providers: [PickSessionService],
  exports: [PickSessionService],
})
export class PickSessionModule {}
