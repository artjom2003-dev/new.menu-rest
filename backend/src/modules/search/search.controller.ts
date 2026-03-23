import { Controller, Get, Post, Body, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Response } from 'express';
import { SearchService } from './search.service';
import { AiSearchService } from './ai-search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly service: SearchService,
    private readonly aiSearchService: AiSearchService,
  ) {}

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

  @Post('ai-stream')
  @ApiOperation({ summary: 'AI-поиск со стримингом (SSE)' })
  async aiSearchStream(@Body() body: { query: string; lat?: number; lng?: number; context?: { role: string; text: string }[] }, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const chunk of this.aiSearchService.recommendStream(body.query || '', body.lat, body.lng, body.context)) {
        res.write(`data: ${chunk}\n\n`);
      }
    } catch (err) {
      console.error('[AI-Stream] Error:', (err as Error).message, (err as Error).stack);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream failed' })}\n\n`);
    }

    res.end();
  }

  @Post('ai')
  @ApiOperation({ summary: 'AI-поиск (Ollama NLU → ES/DB)' })
  async aiSearch(@Body('query') query: string) {
    console.log(`[SearchController] AI search request: "${query}"`);
    try {
      return await Promise.race([
        this.service.aiSearch_query(query),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI search timeout')), 25000)),
      ]);
    } catch {
      return { recommendation: '', restaurants: [], params: {}, source: 'timeout' };
    }
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
