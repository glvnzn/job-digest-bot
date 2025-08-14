import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class EnhanceJobsTable1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to jobs table
    const newColumns = [
      new TableColumn({
        name: 'location',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'salary_min',
        type: 'int',
        isNullable: true,
      }),
      new TableColumn({
        name: 'salary_max',
        type: 'int',
        isNullable: true,
      }),
      new TableColumn({
        name: 'job_type',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
      new TableColumn({
        name: 'requirements',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'benefits',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'source',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
      new TableColumn({
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
      }),
    ];

    for (const column of newColumns) {
      const table = await queryRunner.getTable('jobs');
      if (table) {
        const existingColumn = table.findColumnByName(column.name);
        if (!existingColumn) {
          await queryRunner.addColumn('jobs', column);
        }
      }
    }

    // Add additional indexes for better performance
    try {
      await queryRunner.createIndex(
        'jobs',
        new TableIndex({
          name: 'IDX_jobs_location',
          columnNames: ['location'],
        })
      );
    } catch (error) {
      // Index might already exist
    }

    try {
      await queryRunner.createIndex(
        'jobs',
        new TableIndex({
          name: 'IDX_jobs_job_type',
          columnNames: ['job_type'],
        })
      );
    } catch (error) {
      // Index might already exist
    }

    try {
      await queryRunner.createIndex(
        'jobs',
        new TableIndex({
          name: 'IDX_jobs_source',
          columnNames: ['source'],
        })
      );
    } catch (error) {
      // Index might already exist
    }

    try {
      await queryRunner.createIndex(
        'jobs',
        new TableIndex({
          name: 'IDX_jobs_salary_range',
          columnNames: ['salary_min', 'salary_max'],
        })
      );
    } catch (error) {
      // Index might already exist
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the columns we added
    const columnsToRemove = [
      'updated_at',
      'source',
      'benefits',
      'requirements',
      'job_type',
      'salary_max',
      'salary_min',
      'location',
    ];

    for (const columnName of columnsToRemove) {
      try {
        await queryRunner.dropColumn('jobs', columnName);
      } catch (error) {
        // Column might not exist
      }
    }

    // Drop indexes
    try {
      await queryRunner.dropIndex('jobs', 'IDX_jobs_salary_range');
    } catch (error) {
      // Index might not exist
    }

    try {
      await queryRunner.dropIndex('jobs', 'IDX_jobs_source');
    } catch (error) {
      // Index might not exist
    }

    try {
      await queryRunner.dropIndex('jobs', 'IDX_jobs_job_type');
    } catch (error) {
      // Index might not exist
    }

    try {
      await queryRunner.dropIndex('jobs', 'IDX_jobs_location');
    } catch (error) {
      // Index might not exist
    }
  }
}