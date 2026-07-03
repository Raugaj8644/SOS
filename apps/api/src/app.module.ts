import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import databaseConfig from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AreasModule } from './modules/areas/areas.module';
import { SafePointsModule } from './modules/safe-points/safe-points.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MediaModule } from './modules/media/media.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthController } from './health.controller';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    // ── Config ────────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      load: [databaseConfig],
    }),

    // ── Database ──────────────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ ...config.get('database')!, retryAttempts: 3, retryDelay: 1000 }),
    }),

    // ── In-Memory Cache (no Redis required for dev) ───────────────────────────
    CacheModule.register({ isGlobal: true, ttl: 60_000 }),

    // ── Rate Limiting ─────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'global',
            ttl: 60_000,
            limit: config.get<number>('RATE_LIMIT_GLOBAL', 100),
          },
        ],
      }),
    }),

    // ── Feature Modules ───────────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    AreasModule,
    SafePointsModule,
    IncidentsModule,
    NotificationsModule,
    MediaModule,
    AnalyticsModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
