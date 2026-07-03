import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host:     process.env.DB_HOST ?? 'localhost',
  port:     parseInt(process.env.DB_PORT ?? '5433', 10),
  database: process.env.DB_NAME ?? 'cerp',
  username: process.env.DB_USER ?? 'cerp',
  password: process.env.DB_PASS ?? '',
  entities: [
    join(__dirname, '../modules/**/*.entity{.ts,.js}'),
    join(__dirname, '../common/entities/*.entity{.ts,.js}'),
  ],
  migrations: [join(__dirname, '../database/migrations/*{.ts,.js}')],
  migrationsRun: false, // run migrations manually: railway run node apps/api/dist/migrate.js
  synchronize: false,
  logging: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  // DB_SSL_REJECT_UNAUTHORIZED=false disables cert check (needed for Supabase/Railway)
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : false,
  extra: {
    max: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
    min: parseInt(process.env.DB_POOL_MIN ?? '2', 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  },
}));
