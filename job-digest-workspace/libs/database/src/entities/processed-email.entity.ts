import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('processed_emails')
@Index(['messageId'], { unique: true })
export class ProcessedEmail {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'message_id', unique: true })
  messageId!: string;

  @Column()
  subject!: string;

  @Column({ name: 'from_email' })
  from!: string;

  @Column({ name: 'jobs_extracted', default: 0 })
  jobsExtracted!: number;

  @Column({ default: false })
  deleted!: boolean; // represents archived status

  @CreateDateColumn({ name: 'processed_at' })
  processedAt!: Date;
}