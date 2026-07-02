import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Try .env from cwd first, then walk up to repo root
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(__dirname, '../../../../.env'),
];
for (const p of envPaths) {
  const result = dotenv.config({ path: p });
  if (!result.error) break;
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_NAME     ?? 'cerp',
  username: process.env.DB_USER     ?? 'cerp',
  password: process.env.DB_PASS     ?? 'cerp_secret',
  entities: [
    path.resolve(process.cwd(), 'src/modules/**/*.entity{.ts,.js}'),
    path.resolve(process.cwd(), 'src/common/entities/*.entity{.ts,.js}'),
  ],
  migrations: [
    path.resolve(process.cwd(), 'src/database/migrations/*{.ts,.js}'),
  ],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : false,
  extra: {
    max: 20,
    min: 2,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    options: '-c timezone=UTC',
  },
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
