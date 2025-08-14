import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { UserJob } from './user-job.entity';

@Entity('jobs')
@Index(['emailMessageId'])
@Index(['relevanceScore'])
@Index(['createdAt'])
@Index(['processed'])
export class Job {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column()
  company!: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ name: 'apply_url', nullable: true })
  applyUrl?: string;

  @Column({ name: 'is_remote', default: false })
  isRemote!: boolean;

  @Column('decimal', { name: 'relevance_score', precision: 3, scale: 2 })
  relevanceScore!: number;

  @Column({ name: 'email_message_id' })
  emailMessageId!: string;

  @Column({ name: 'processed', default: false })
  processed!: boolean;

  @Column({ name: 'location', nullable: true })
  location?: string;

  @Column({ name: 'salary_min', nullable: true })
  salaryMin?: number;

  @Column({ name: 'salary_max', nullable: true })
  salaryMax?: number;

  @Column({ name: 'job_type', nullable: true })
  jobType?: string; // 'full-time', 'part-time', 'contract', 'internship'

  @Column('text', { name: 'requirements', nullable: true })
  requirements?: string;

  @Column('text', { name: 'benefits', nullable: true })
  benefits?: string;

  @Column({ name: 'source', nullable: true })
  source?: string; // e.g., 'indeed', 'linkedin', 'company-website'

  @OneToMany(() => UserJob, userJob => userJob.job)
  userJobs!: UserJob[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}