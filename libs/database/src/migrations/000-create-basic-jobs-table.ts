import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBasicJobsTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create basic jobs table that matches the original system
    await queryRunner.createTable(
      new Table({
        name: 'jobs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'company',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'apply_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'relevance_score',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'is_remote',
            type: 'boolean',
            default: false,
          },
          {
            name: 'email_message_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'processed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create basic indexes
    await queryRunner.createIndex(
      'jobs',
      new TableIndex({
        name: 'IDX_jobs_relevance_score',
        columnNames: ['relevance_score'],
      })
    );

    await queryRunner.createIndex(
      'jobs',
      new TableIndex({
        name: 'IDX_jobs_created_at',
        columnNames: ['created_at'],
      })
    );

    await queryRunner.createIndex(
      'jobs',
      new TableIndex({
        name: 'IDX_jobs_processed',
        columnNames: ['processed'],
      })
    );

    await queryRunner.createIndex(
      'jobs',
      new TableIndex({
        name: 'IDX_jobs_email_message_id',
        columnNames: ['email_message_id'],
      })
    );

    // Create other required tables
    await queryRunner.createTable(
      new Table({
        name: 'resume_analysis',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'skills',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'experience',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'education',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'summary',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'processed_emails',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'message_id',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'subject',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sender',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'processed_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'job_locks',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'lock_name',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'locked_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Add indexes for performance
    await queryRunner.createIndex(
      'processed_emails',
      new TableIndex({
        name: 'IDX_processed_emails_message_id',
        columnNames: ['message_id'],
      })
    );

    await queryRunner.createIndex(
      'job_locks',
      new TableIndex({
        name: 'IDX_job_locks_lock_name',
        columnNames: ['lock_name'],
      })
    );

    await queryRunner.createIndex(
      'job_locks',
      new TableIndex({
        name: 'IDX_job_locks_expires_at',
        columnNames: ['expires_at'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('job_locks');
    await queryRunner.dropTable('processed_emails');
    await queryRunner.dropTable('resume_analysis');
    await queryRunner.dropTable('jobs');
  }
}