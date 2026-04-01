import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('BACKEND_PORT', 3001);
  const corsOrigins = configService.get<string>(
    'CORS_ORIGINS',
    'http://localhost:3000,http://localhost:5174,http://localhost:5180,http://localhost:5181,http://localhost:5182',
  ).split(',');

  // Security
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Menu-Rest API')
    .setDescription('API платформы Menu-Rest — ресторанный агрегатор с AI-поиском')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('restaurants', 'Рестораны')
    .addTag('menu', 'Меню и блюда')
    .addTag('search', 'Поиск (AI + Elasticsearch)')
    .addTag('auth', 'Авторизация')
    .addTag('users', 'Пользователи')
    .addTag('bookings', 'Бронирования')
    .addTag('reviews', 'Отзывы')
    .addTag('blog', 'Блог и статьи')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  console.log(`🚀 Backend запущен: http://localhost:${port}/api`);
  console.log(`📖 Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
