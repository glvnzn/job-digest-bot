import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateUserManagementTables1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'google_id',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'avatar_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'telegram_chat_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'settings',
            type: 'jsonb',
            default: "'{}'",
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

    // Create job_stages table
    await queryRunner.createTable(
      new Table({
        name: 'job_stages',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '7',
            isNullable: false,
          },
          {
            name: 'sort_order',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'is_default',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_system',
            type: 'boolean',
            default: false,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: true,
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

    // Create user_jobs table
    await queryRunner.createTable(
      new Table({
        name: 'user_jobs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'job_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'stage_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'is_interested',
            type: 'boolean',
            default: false,
          },
          {
            name: 'applied_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'interview_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'application_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'contact_person',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'salary_expectation',
            type: 'int',
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
        uniques: [
          {
            name: 'UQ_user_job',
            columnNames: ['user_id', 'job_id'],
          },
        ],
      }),
      true
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_email',
        columnNames: ['email'],
      })
    );
    
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_google_id',
        columnNames: ['google_id'],
      })
    );

    await queryRunner.createIndex(
      'job_stages',
      new TableIndex({
        name: 'IDX_job_stages_user_sort',
        columnNames: ['user_id', 'sort_order'],
      })
    );

    await queryRunner.createIndex(
      'job_stages',
      new TableIndex({
        name: 'IDX_job_stages_system',
        columnNames: ['is_system'],
      })
    );

    await queryRunner.createIndex(
      'user_jobs',
      new TableIndex({
        name: 'IDX_user_jobs_user',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'user_jobs',
      new TableIndex({
        name: 'IDX_user_jobs_job',
        columnNames: ['job_id'],
      })
    );

    await queryRunner.createIndex(
      'user_jobs',
      new TableIndex({
        name: 'IDX_user_jobs_stage',
        columnNames: ['stage_id'],
      })
    );

    await queryRunner.createIndex(
      'user_jobs',
      new TableIndex({
        name: 'IDX_user_jobs_interested',
        columnNames: ['is_interested'],
      })
    );

    // Create foreign key constraints
    await queryRunner.createForeignKey(
      'job_stages',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'user_jobs',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'user_jobs',
      new TableForeignKey({
        columnNames: ['job_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'jobs',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'user_jobs',
      new TableForeignKey({
        columnNames: ['stage_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'job_stages',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.dropTable('user_jobs');
    await queryRunner.dropTable('job_stages');
    await queryRunner.dropTable('users');
  }
}