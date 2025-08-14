import { Module, DynamicModule, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

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

// Repositories
import {
  UserRepository,
  JobRepository,
  JobStageRepository,
  UserJobRepository,
} from './repositories';

// Migrations
import { CreateBasicJobsTable1700000000000 } from './migrations/000-create-basic-jobs-table';
import { CreateUserManagementTables1700000000001 } from './migrations/001-create-user-management-tables';
import { EnhanceJobsTable1700000000002 } from './migrations/002-enhance-jobs-table';

// Seeders
import { DefaultJobStagesSeeder } from './seeders/default-job-stages.seeder';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean;
}

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        ConfigModule,
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            url: configService.get<string>('DATABASE_URL'),
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
            synchronize: false, // Always use migrations in production
            logging: configService.get<string>('NODE_ENV') === 'development',
            ssl: configService.get<string>('NODE_ENV') === 'production' 
              ? { rejectUnauthorized: false } 
              : false,
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([
          User,
          Job,
          JobStage,
          UserJob,
          ResumeAnalysis,
          ProcessedEmail,
          JobLock,
        ]),
      ],
      providers: [
        UserRepository,
        JobRepository,
        JobStageRepository,
        UserJobRepository,
      ],
      exports: [
        TypeOrmModule,
        UserRepository,
        JobRepository,
        JobStageRepository,
        UserJobRepository,
      ],
    };
  }

  static forFeature(entities: any[]): DynamicModule {
    return TypeOrmModule.forFeature(entities);
  }
}

export { DefaultJobStagesSeeder };
export * from './entities';
export * from './repositories';
export * from './migrations';
export * from './seeders';