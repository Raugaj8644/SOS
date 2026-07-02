import * as dotenv from 'dotenv';
import * as path from 'path';

// DOTENV_PATH env var set by cross-env in package.json script
// resolves relative to apps/api (cwd when pnpm runs the script)
const envFile = process.env.DOTENV_PATH
  ? path.resolve(process.cwd(), process.env.DOTENV_PATH)
  : path.resolve(process.cwd(), '../../.env');

dotenv.config({ path: envFile });

// Import AFTER dotenv so env vars are available
import('./src/database/data-source').then(async ({ default: AppDataSource }) => {
  try {
    await AppDataSource.initialize();
    console.log('📦 Running migrations...');
    const migrations = await AppDataSource.runMigrations({ transaction: 'all' });
    if (migrations.length === 0) {
      console.log('✅ No pending migrations.');
    } else {
      migrations.forEach((m) => console.log(`  ✅ ${m.name}`));
      console.log(`\n✅ ${migrations.length} migration(s) complete!`);
    }
    await AppDataSource.destroy();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
});
