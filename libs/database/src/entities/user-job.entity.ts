import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { User } from './user.entity';
import { Job } from './job.entity';
import { JobStage } from './job-stage.entity';

@Entity('user_jobs')
@Unique(['userId', 'jobId'])
@Index(['userId'])
@Index(['jobId'])
@Index(['stageId'])
@Index(['isInterested'])
export class UserJob {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'job_id' })
  jobId!: number;

  @Column({ name: 'stage_id' })
  stageId!: number;

  @ManyToOne(() => User, user => user.userJobs, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Job, job => job.userJobs, { onDelete: 'CASCADE' })
  job!: Job;

  @ManyToOne(() => JobStage, stage => stage.userJobs, { onDelete: 'CASCADE' })
  stage!: JobStage;

  @Column({ name: 'is_interested', default: false })
  isInterested!: boolean;

  @Column({ name: 'applied_date', nullable: true })
  appliedDate?: Date;

  @Column({ name: 'interview_date', nullable: true })
  interviewDate?: Date;

  @Column('text', { nullable: true })
  notes?: string;

  @Column({ name: 'application_url', nullable: true })
  applicationUrl?: string;

  @Column({ name: 'contact_person', nullable: true })
  contactPerson?: string;

  @Column({ name: 'salary_expectation', nullable: true })
  salaryExpectation?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}