import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from '@database/entities/restaurant.entity';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { AiSearchService } from './ai-search.service';
import { MetroIndexService } from './metro-index.service';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant])],
  controllers: [SearchController],
  providers: [SearchService, AiSearchService, MetroIndexService],
  exports: [SearchService],
})
export class SearchModule implements OnModuleInit {
  constructor(private readonly searchService: SearchService) {}

  async onModuleInit() {
    await this.searchService.ensureIndex();
  }
}
