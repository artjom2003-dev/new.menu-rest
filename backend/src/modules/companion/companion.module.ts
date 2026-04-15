import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Companion } from '@database/entities/companion.entity';
import { User } from '@database/entities/user.entity';
import { CompanionController } from './companion.controller';
import { CompanionService } from './companion.service';

@Module({
  imports: [TypeOrmModule.forFeature([Companion, User])],
  controllers: [CompanionController],
  providers: [CompanionService],
  exports: [CompanionService],
})
export class CompanionModule {}
