import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Entities
import {
  User,
  Job,
  JobStage,
  UserJob,
  ResumeAnalysis,
  ProcessedEmail,
  JobLock,
} from './entities';

// Migrations
import { CreateBasicJobsTable1700000000000 } from './migrations/000-create-basic-jobs-table';
import { CreateUserManagementTables1700000000001 } from './migrations/001-create-user-management-tables';
import { EnhanceJobsTable1700000000002 } from './migrations/002-enhance-jobs-table';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env['DATABASE_URL'],
  entities: [
    User,
    Job,
    JobStage,
    UserJob,
    ResumeAnalysis,
    ProcessedEmail,
    JobLock,
  ],
  migrations: [
    CreateBasicJobsTable1700000000000,
    CreateUserManagementTables1700000000001,
    EnhanceJobsTable1700000000002,
  ],
  synchronize: false,
  logging: process.env['NODE_ENV'] === 'development',
  ssl: process.env['NODE_ENV'] === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
});

export default AppDataSource;