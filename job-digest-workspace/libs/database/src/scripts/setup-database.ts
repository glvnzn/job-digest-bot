#!/usr/bin/env node
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from workspace root
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { DefaultJobStagesSeeder } from '../seeders/default-job-stages.seeder';

async function setupDatabase() {
  console.log('🚀 Starting database setup...');

  try {
    // Initialize data source
    console.log('📡 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // Run migrations
    console.log('📝 Running migrations...');
    await AppDataSource.runMigrations();
    console.log('✅ Migrations completed');

    // Run seeders
    console.log('🌱 Running seeders...');
    try {
      await DefaultJobStagesSeeder.run(AppDataSource);
      console.log('✅ Seeders completed');
    } catch (error) {
      console.log('⚠️  Seeders may have already run or encountered an issue:', error instanceof Error ? error.message : String(error));
    }

    console.log('🎉 Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase().catch((error) => {
    console.error('❌ Setup script failed:', error);
    process.exit(1);
  });
}

export { setupDatabase };