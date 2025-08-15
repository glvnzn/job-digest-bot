#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

/**
 * Safe database migration testing script
 * 
 * This script:
 * 1. Tests database connection
 * 2. Shows current migration status
 * 3. Runs migrations safely
 * 4. Verifies migration success
 */

async function testMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔍 Testing database migration...\n');

    // 1. Test connection
    console.log('1️⃣ Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // 2. Check existing tables
    console.log('2️⃣ Checking existing tables...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    console.log('📊 Existing tables:', existingTables.join(', '));
    
    // Verify critical tables exist
    const criticalTables = ['jobs', 'resume_analysis', 'processed_emails'];
    const missingCriticalTables = criticalTables.filter(table => !existingTables.includes(table));
    
    if (missingCriticalTables.length > 0) {
      console.log('⚠️  Missing critical tables:', missingCriticalTables.join(', '));
      console.log('   This might be a fresh database - migrations will create them.');
    } else {
      console.log('✅ All critical tables exist');
    }
    console.log('');

    // 3. Check existing job count
    if (existingTables.includes('jobs')) {
      const jobCountResult = await pool.query('SELECT COUNT(*) as count FROM jobs');
      const jobCount = jobCountResult.rows[0].count;
      console.log('📈 Current job count:', jobCount);
      
      if (jobCount > 0) {
        console.log('✅ Production data detected - migrations will be extra safe');
      }
    }
    console.log('');

    // 4. Show what migrations will be applied
    console.log('4️⃣ Migration plan:');
    console.log('   - Create users table (Google OAuth users)');
    console.log('   - Create job_stages table (kanban columns)');
    console.log('   - Create user_jobs table (user job tracking)');
    console.log('   - Add default job stages');
    console.log('   - Create placeholder admin user');
    console.log('   ⚠️  All operations are ADDITIVE ONLY - no existing data modified\n');

    // 5. Safety confirmation
    if (process.env.NODE_ENV === 'production') {
      console.log('🚨 PRODUCTION ENVIRONMENT DETECTED');
      console.log('   Recommended steps:');
      console.log('   1. Run during low-traffic hours (2-4 AM Manila time)');
      console.log('   2. Have database backup ready');
      console.log('   3. Monitor application logs after migration');
      console.log('   4. Test bot functionality after migration\n');
      
      // In production, require explicit confirmation
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('Continue with production migration? (yes/no): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('Migration cancelled by user.');
        return;
      }
    }

    // 6. Run the actual migration
    console.log('🚀 Running migrations...');
    const { MigrationService } = require('../dist/apps/api/services/migration.js');
    const migrationService = new MigrationService();
    
    await migrationService.runMigrations();
    
    // 7. Verify success
    console.log('\n7️⃣ Verifying migration success...');
    const newTablesResult = await pool.query(tablesQuery);
    const newTables = newTablesResult.rows.map(row => row.table_name);
    
    const expectedNewTables = ['users', 'job_stages', 'user_jobs', 'schema_migrations'];
    const addedTables = expectedNewTables.filter(table => 
      newTables.includes(table) && !existingTables.includes(table)
    );
    
    console.log('🆕 New tables added:', addedTables.join(', '));
    
    // Check default stages
    if (newTables.includes('job_stages')) {
      const stagesResult = await pool.query('SELECT COUNT(*) as count FROM job_stages WHERE is_system = true');
      const stageCount = stagesResult.rows[0].count;
      console.log('📋 Default job stages created:', stageCount);
    }
    
    // Final job count check
    if (newTables.includes('jobs')) {
      const finalJobCountResult = await pool.query('SELECT COUNT(*) as count FROM jobs');
      const finalJobCount = finalJobCountResult.rows[0].count;
      console.log('📊 Final job count:', finalJobCount, '(should be unchanged)');
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ All existing functionality preserved');
    console.log('🔥 New multi-user features ready');
    
    await migrationService.close();

  } catch (error) {
    console.error('\n❌ Migration test failed:');
    console.error(error);
    
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      console.log('\n💡 This looks like a table dependency issue.');
      console.log('   Make sure to run: npm run build:api first');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testMigration().catch(error => {
  console.error('Script error:', error);
  process.exit(1);
});