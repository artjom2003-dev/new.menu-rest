import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Поиск ресторанов с фильтрами' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'cuisine', required: false })
  @ApiQuery({ name: 'diet', required: false })
  @ApiQuery({ name: 'priceMax', required: false, type: Number })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  search(@Query() query: Record<string, string>) {
    return this.service.search({
      ...query,
      priceMax: query.priceMax ? Number(query.priceMax) : undefined,
      lat: query.lat ? Number(query.lat) : undefined,
      lng: query.lng ? Number(query.lng) : undefined,
      page: query.page ? Number(query.page) : 1,
    });
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Автодополнение для строки поиска' })
  @ApiQuery({ name: 'q', required: true })
  autocomplete(@Query('q') q: string) {
    return this.service.autocomplete(q || '');
  }

  @Post('ai')
  @ApiOperation({ summary: 'AI-поиск (Gemini NLU → Elasticsearch)' })
  aiSearch(@Body('query') query: string) {
    return this.service.aiSearch_query(query);
  }

  @Post('reindex')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Переиндексация всех ресторанов в ES (admin)' })
  async reindex() {
    const count = await this.service.reindexAll();
    return { indexed: count };
  }
}
