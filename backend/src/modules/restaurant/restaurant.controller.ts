import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  Query, ParseIntPipe, HttpCode, HttpStatus, UseGuards,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiConsumes, ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RestaurantService } from './restaurant.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { QueryRestaurantDto } from './dto/query-restaurant.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantController {
  constructor(private readonly service: RestaurantService) {}

  @Get()
  @ApiOperation({ summary: 'Список ресторанов с фильтрацией и пагинацией' })
  findAll(@Query() query: QueryRestaurantDto) {
    return this.service.findAll(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Карточка ресторана по slug' })
  @ApiParam({ name: 'slug', example: 'il-forno' })
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Создать ресторан (admin)' })
  @ApiBearerAuth()
  create(@Body() dto: CreateRestaurantDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Обновить ресторан (admin)' })
  @ApiBearerAuth()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestaurantDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить ресторан (admin)' })
  @ApiBearerAuth()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // ─── Photos ──────────────────────────────────────────
  @Post(':id/photos')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Загрузить фото ресторана (admin)' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, isCover: { type: 'boolean' } } } })
  uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('isCover') isCover?: string,
  ) {
    return this.service.uploadPhoto(id, file, isCover === 'true');
  }

  @Delete(':id/photos/:photoId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить фото ресторана (admin)' })
  @ApiBearerAuth()
  removePhoto(
    @Param('id', ParseIntPipe) id: number,
    @Param('photoId', ParseIntPipe) photoId: number,
  ) {
    return this.service.removePhoto(id, photoId);
  }

  @Patch(':id/photos/:photoId/cover')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Сделать фото обложкой (admin)' })
  @ApiBearerAuth()
  setCover(
    @Param('id', ParseIntPipe) id: number,
    @Param('photoId', ParseIntPipe) photoId: number,
  ) {
    return this.service.setCoverPhoto(id, photoId);
  }
}
