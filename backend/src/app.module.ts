import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';

import { RestaurantModule } from '@modules/restaurant/restaurant.module';
import { MenuModule } from '@modules/menu/menu.module';
import { SearchModule } from '@modules/search/search.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { BookingModule } from '@modules/booking/booking.module';
import { ReviewModule } from '@modules/review/review.module';
import { ContentModule } from '@modules/content/content.module';
import { LoyaltyModule } from '@modules/loyalty/loyalty.module';
import { AdminModule } from '@modules/admin/admin.module';
import { BudgetCalcModule } from '@modules/budget-calc/budget-calc.module';
import { RestaurantRequestModule } from '@modules/restaurant-request/restaurant-request.module';
import { ChatModule } from '@modules/chat/chat.module';
import { GastroModule } from '@modules/gastro/gastro.module';
import { TablesModule } from '@modules/tables/tables.module';
import { StaffModule } from '@modules/staff/staff.module';
import { OrdersModule } from '@modules/orders/orders.module';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT', 5432),
        database: config.get('DB_NAME'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: config.get('DB_SYNC') === 'true',
        logging: config.get('DB_LOGGING') === 'true',
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([{
        ttl: config.get<number>('THROTTLE_TTL', 60000),
        limit: config.get<number>('THROTTLE_LIMIT', 100),
      }]),
    }),

    // Queue (BullMQ)
    // BullModule disabled — Redis not available in dev
    // BullModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => ({
    //     redis: {
    //       host: config.get('REDIS_HOST', 'localhost'),
    //       port: config.get<number>('REDIS_PORT', 6379),
    //       password: config.get('REDIS_PASSWORD') || undefined,
    //     },
    //   }),
    // }),

    // Common (StorageService, etc.)
    CommonModule,

    // Feature modules
    RestaurantModule,
    MenuModule,
    SearchModule,
    AuthModule,
    UserModule,
    BookingModule,
    ReviewModule,
    ContentModule,
    LoyaltyModule,
    AdminModule,
    BudgetCalcModule,
    RestaurantRequestModule,
    ChatModule,
    GastroModule,
    TablesModule,
    StaffModule,
    OrdersModule,
  ],
})
export class AppModule {}
