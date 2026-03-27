import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { GastroService } from './gastro.service';

@ApiTags('gastro')
@Controller('gastro')
export class GastroController {
  constructor(private readonly service: GastroService) {}

  @Get('quiz/questions')
  @ApiOperation({ summary: 'Получить вопросы гастро-квиза' })
  getQuestions() {
    return this.service.getQuestions();
  }

  @Post('quiz/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отправить ответы на квиз и получить гастро-профиль' })
  submitQuiz(
    @CurrentUser('id') userId: number,
    @Body() body: { answers: Record<number, number[]> },
  ) {
    return this.service.submitQuiz(userId, body.answers);
  }

  @Get('quiz/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить свой гастро-профиль' })
  getProfile(@CurrentUser('id') userId: number) {
    return this.service.getProfile(userId);
  }

  @Get('reco/restaurants')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Рестораны, подобранные по гастро-профилю' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getRecoRestaurants(
    @CurrentUser('id') userId: number,
    @Query('city') city?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getRecoRestaurants(userId, city, Number(limit) || 12);
  }
}
