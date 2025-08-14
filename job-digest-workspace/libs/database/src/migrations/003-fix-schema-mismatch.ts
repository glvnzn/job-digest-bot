import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class FixSchemaMismatch1700000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix processed_emails table schema
    // 1. Rename 'sender' column to 'from_email' to match entity
    await queryRunner.renameColumn('processed_emails', 'sender', 'from_email');

    // 2. Add missing columns to processed_emails
    await queryRunner.addColumn(
      'processed_emails',
      new TableColumn({
        name: 'jobs_extracted',
        type: 'int',
        default: 0,
        isNullable: false,
      })
    );

    await queryRunner.addColumn(
      'processed_emails',
      new TableColumn({
        name: 'deleted',
        type: 'boolean',
        default: false,
        isNullable: false,
      })
    );

    // Fix resume_analysis table schema
    // 1. Add missing columns
    await queryRunner.addColumn(
      'resume_analysis',
      new TableColumn({
        name: 'preferred_roles',
        type: 'json',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'resume_analysis',
      new TableColumn({
        name: 'seniority',
        type: 'varchar',
        length: '50',
        isNullable: true,
      })
    );

    // 2. Rename created_at to analyzed_at to match entity
    await queryRunner.renameColumn('resume_analysis', 'created_at', 'analyzed_at');

    // 3. Convert text columns to json for skills and experience
    await queryRunner.changeColumn('resume_analysis', 'skills', new TableColumn({
      name: 'skills',
      type: 'json',
      isNullable: true,
    }));

    await queryRunner.changeColumn('resume_analysis', 'experience', new TableColumn({
      name: 'experience',
      type: 'json',
      isNullable: true,
    }));

    // 4. Drop unused columns
    await queryRunner.dropColumn('resume_analysis', 'education');
    await queryRunner.dropColumn('resume_analysis', 'summary');
    await queryRunner.dropColumn('resume_analysis', 'updated_at');

    // Fix jobs table schema - columns already exist from migration 002, so no changes needed
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the changes (for rollback)
    
    // Jobs table - no changes to reverse

    // Reverse resume_analysis changes
    await queryRunner.addColumn('resume_analysis', new TableColumn({
      name: 'education',
      type: 'text',
      isNullable: true,
    }));
    
    await queryRunner.addColumn('resume_analysis', new TableColumn({
      name: 'summary',
      type: 'text',
      isNullable: true,
    }));
    
    await queryRunner.addColumn('resume_analysis', new TableColumn({
      name: 'updated_at',
      type: 'timestamp',
      default: 'CURRENT_TIMESTAMP',
      onUpdate: 'CURRENT_TIMESTAMP',
    }));

    await queryRunner.changeColumn('resume_analysis', 'skills', new TableColumn({
      name: 'skills',
      type: 'text',
      isNullable: true,
    }));

    await queryRunner.changeColumn('resume_analysis', 'experience', new TableColumn({
      name: 'experience',
      type: 'text',
      isNullable: true,
    }));

    await queryRunner.renameColumn('resume_analysis', 'analyzed_at', 'created_at');
    await queryRunner.dropColumn('resume_analysis', 'seniority');
    await queryRunner.dropColumn('resume_analysis', 'preferred_roles');

    // Reverse processed_emails changes
    await queryRunner.dropColumn('processed_emails', 'deleted');
    await queryRunner.dropColumn('processed_emails', 'jobs_extracted');
    await queryRunner.renameColumn('processed_emails', 'from_email', 'sender');
  }
}