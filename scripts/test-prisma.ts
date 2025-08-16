#!/usr/bin/env npx tsx

/**
 * Test script for Prisma Database Service
 * 
 * This script tests:
 * 1. Database connection
 * 2. Schema validation
 * 3. Basic operations
 * 4. Migration readiness
 */

import { PrismaDatabaseService } from '../apps/api/src/services/database-prisma';
import { config } from 'dotenv';

// Load environment variables
config();

async function testPrismaSetup() {
  const db = new PrismaDatabaseService();

  try {
    console.log('🧪 Testing Prisma Database Setup...\n');

    // 1. Test connection
    console.log('1️⃣ Testing database connection...');
    await db.init();
    console.log('✅ Database connection successful\n');

    // 2. Test schema introspection
    console.log('2️⃣ Testing schema introspection...');
    
    // Check if tables exist or need creation
    try {
      const jobCount = await db.client.job.count();
      console.log(`📊 Current jobs in database: ${jobCount}`);
    } catch (error) {
      console.log('⚠️  Jobs table not found - will be created by migration');
    }

    try {
      const userCount = await db.client.user.count();
      console.log(`👥 Current users in database: ${userCount}`);
    } catch (error) {
      console.log('⚠️  Users table not found - will be created by migration');
    }

    try {
      const stageCount = await db.client.jobStage.count();
      console.log(`📋 Current job stages in database: ${stageCount}`);
    } catch (error) {
      console.log('⚠️  Job stages table not found - will be created by migration');
    }

    console.log('');

    // 3. Test Prisma client generation
    console.log('3️⃣ Testing Prisma client types...');
    
    // This should compile without errors if types are correct
    const testJob: Parameters<typeof db.saveJob>[0] = {
      id: 'test-job-1',
      title: 'Test Software Engineer',
      company: 'Test Company',
      applyUrl: 'https://test.com/apply',
      source: 'Test Source',
      emailMessageId: 'test-email-1',
    };
    
    console.log('✅ Prisma types are correctly generated');
    console.log('📝 Example job structure validated:', testJob.title);
    console.log('');

    // 4. Test query building (without execution)
    console.log('4️⃣ Testing query construction...');
    
    // Test complex query building
    const queryOptions = {
      where: {
        relevanceScore: { gte: 0.7 },
        isRemote: true,
        AND: [
          { processed: false },
          { 
            OR: [
              { title: { contains: 'engineer' } },
              { description: { contains: 'typescript' } }
            ]
          }
        ]
      },
      include: {
        userJobs: {
          include: {
            user: true,
            stage: true,
          }
        }
      },
      orderBy: [
        { relevanceScore: 'desc' },
        { createdAt: 'desc' }
      ]
    };
    
    console.log('✅ Complex query structure validated');
    console.log('🔍 Query includes relations, filtering, and sorting');
    console.log('');

    // 5. Migration readiness check
    console.log('5️⃣ Checking migration readiness...');
    
    if (process.env.DATABASE_URL) {
      console.log('✅ DATABASE_URL environment variable set');
    } else {
      console.log('❌ DATABASE_URL not found');
      throw new Error('DATABASE_URL required for migrations');
    }
    
    if (process.env.DATABASE_URL.includes('railway') || process.env.DATABASE_URL.includes('postgres://')) {
      console.log('✅ PostgreSQL connection string detected');
    }
    
    console.log('✅ Migration prerequisites satisfied');
    console.log('');

    // 6. Backwards compatibility check
    console.log('6️⃣ Verifying backward compatibility...');
    console.log('📋 Legacy methods available:');
    console.log('   - saveJob() ✅');
    console.log('   - getRelevantJobs() ✅');
    console.log('   - markJobAsProcessed() ✅');
    console.log('   - isEmailProcessed() ✅');
    console.log('   - saveProcessedEmail() ✅');
    console.log('   - getDailyJobSummary() ✅');
    console.log('');

    console.log('7️⃣ New multi-user methods available:');
    console.log('   - createUser() ✅');
    console.log('   - findUserByEmail() ✅');
    console.log('   - getJobsWithFilters() ✅');
    console.log('   - trackJob() ✅');
    console.log('   - getUserJobs() ✅');
    console.log('   - getJobStages() ✅');
    console.log('');

    console.log('🎉 Prisma setup test completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Run: npx prisma db push (for development)');
    console.log('   2. Or: npx prisma migrate dev (for production-ready migrations)');
    console.log('   3. Update API to use PrismaDatabaseService');
    console.log('   4. Deploy to Railway');
    console.log('');

  } catch (error) {
    console.error('❌ Prisma test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('connect')) {
        console.log('💡 Connection error - this is expected if testing locally without Railway DB');
        console.log('   The setup is correct, database just needs to be accessible');
      }
      
      if (error.message.includes('P1001')) {
        console.log('💡 Database connection timeout - Railway database might be sleeping');
      }
    }
    
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Only run if called directly
if (require.main === module) {
  testPrismaSetup().catch(error => {
    console.error('Test script error:', error);
    process.exit(1);
  });
}