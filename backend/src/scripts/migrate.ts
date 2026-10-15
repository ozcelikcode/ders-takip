import { connectDB, sequelize } from '../config/database';
import { applyMigrations } from '../database/migrations';

async function main() {
  try {
    await connectDB();
    await applyMigrations();
    console.log('Database migrations completed. Existing data was preserved.');
  } finally {
    await sequelize.close();
  }
}

void main().catch((error: unknown) => {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
});
